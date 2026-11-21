"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { VehicleDamagePointDto } from "@/store/api/fleetApi";
import {
  CAMERA_PRESETS,
  CAMERA_PRESET_BUTTONS,
  type CameraPreset,
  VEHICLE_ZONES,
  getZoneLabel,
  mapObjectToZoneKey,
} from "@/lib/fleet/vehicle3dData";
import { getFleetText } from "@/lib/i18n/fleetText";

export { VEHICLE_ZONES, getZoneLabel };

interface Vehicle3DDamageViewerProps {
  damagePoints: VehicleDamagePointDto[];
  selectedZones: string[];
  onToggleZone: (zoneKey: string) => void;
  isRtl: boolean;
  height?: number;
}

function createShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 22, 128, 128, 124);
    grad.addColorStop(0, "rgba(15, 23, 42, 0.45)");
    grad.addColorStop(0.55, "rgba(15, 23, 42, 0.16)");
    grad.addColorStop(1, "rgba(15, 23, 42, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function tintMaterial(mat: THREE.Material, hexColor: number, intensity = 0.55): THREE.Material {
  const cloned = mat.clone();
  const c = new THREE.Color(hexColor);
  if ("emissive" in cloned && cloned.emissive instanceof THREE.Color) {
    cloned.emissive.copy(c);
    (cloned as THREE.MeshStandardMaterial).emissiveIntensity = intensity;
  }
  if ("color" in cloned && cloned.color instanceof THREE.Color) {
    cloned.color.lerp(c, 0.35);
  }
  return cloned;
}

function splitUnibodyMesh(
  mesh: THREE.Mesh,
  carBounds: THREE.Box3,
): Array<{ mesh: THREE.Mesh; zone: string | null }> {
  const srcGeo = mesh.geometry;
  const posAttr = srcGeo.getAttribute("position");
  const normAttr = srcGeo.getAttribute("normal");
  const uvAttr = srcGeo.getAttribute("uv");
  if (!posAttr) return [{ mesh, zone: "roof" }];

  mesh.updateWorldMatrix(true, false);
  const worldMat = mesh.matrixWorld;
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  carBounds.getSize(size);
  carBounds.getCenter(center);

  const buckets: Record<string, { pos: number[]; norm: number[]; uv: number[] }> = {
    roof: { pos: [], norm: [], uv: [] },
    fender_rl: { pos: [], norm: [], uv: [] },
    fender_rr: { pos: [], norm: [], uv: [] },
    frame: { pos: [], norm: [], uv: [] },
  };

  const index = srcGeo.getIndex();
  const triCount = index ? Math.floor(index.count / 3) : Math.floor(posAttr.count / 3);
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const centroid = new THREE.Vector3();

  const pushVert = (bucket: { pos: number[]; norm: number[]; uv: number[] }, idx: number) => {
    bucket.pos.push(posAttr.getX(idx), posAttr.getY(idx), posAttr.getZ(idx));
    if (normAttr) bucket.norm.push(normAttr.getX(idx), normAttr.getY(idx), normAttr.getZ(idx));
    if (uvAttr) bucket.uv.push(uvAttr.getX(idx), uvAttr.getY(idx));
  };

  for (let t = 0; t < triCount; t++) {
    const i0 = index ? index.getX(t * 3) : t * 3;
    const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;

    vA.fromBufferAttribute(posAttr, i0).applyMatrix4(worldMat);
    vB.fromBufferAttribute(posAttr, i1).applyMatrix4(worldMat);
    vC.fromBufferAttribute(posAttr, i2).applyMatrix4(worldMat);
    centroid.copy(vA).add(vB).add(vC).divideScalar(3);

    const nx = (centroid.x - center.x) / (size.x || 1);
    const ny = (centroid.y - carBounds.min.y) / (size.y || 1);
    const nz = (centroid.z - center.z) / (size.z || 1);

    let key = "frame";
    if (ny >= 0.76) {
      key = "roof";
    } else if (nz < -0.14 && ny < 0.76) {
      key = nx >= 0 ? "fender_rl" : "fender_rr";
    }

    const b = buckets[key];
    pushVert(b, i0);
    pushVert(b, i1);
    pushVert(b, i2);
  }

  const out: Array<{ mesh: THREE.Mesh; zone: string | null }> = [];
  for (const [key, b] of Object.entries(buckets)) {
    if (b.pos.length === 0) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(b.pos, 3));
    if (b.norm.length > 0) g.setAttribute("normal", new THREE.Float32BufferAttribute(b.norm, 3));
    if (b.uv.length > 0) g.setAttribute("uv", new THREE.Float32BufferAttribute(b.uv, 2));

    const partMesh = new THREE.Mesh(g, mesh.material);
    partMesh.castShadow = true;
    partMesh.receiveShadow = true;
    partMesh.applyMatrix4(worldMat);
    out.push({ mesh: partMesh, zone: key === "frame" ? null : key });
  }

  mesh.visible = false;
  return out;
}

export function Vehicle3DDamageViewer({
  damagePoints,
  selectedZones,
  onToggleZone,
  isRtl,
  height = 420,
}: Vehicle3DDamageViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshZoneMapRef = useRef<Map<THREE.Mesh, string>>(new Map());
  const originalMatMapRef = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());
  const onToggleZoneRef = useRef(onToggleZone);
  useEffect(() => {
    onToggleZoneRef.current = onToggleZone;
  }, [onToggleZone]);

  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<CameraPreset>("iso");
  const [isLoadingModel, setIsLoadingModel] = useState(true);
  const [modelReadyTick, setModelReadyTick] = useState(0);

  const txt = getFleetText(isRtl).viewer;

  const handlePresetClick = (preset: CameraPreset) => {
    setActivePreset(preset);
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    if (cam && ctrl) {
      const [x, y, z] = CAMERA_PRESETS[preset];
      cam.position.set(x, y, z);
      ctrl.target.set(0, 0.58, 0);
      ctrl.update();
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    scene.fog = new THREE.Fog(0xf8fafc, 11, 24);

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(...CAMERA_PRESETS.iso);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    scene.environment = pmrem.fromScene(roomEnv, 0.04).texture;
    roomEnv.dispose();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.58, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 2.8;
    controls.maxDistance = 8.2;
    controls.update();
    controlsRef.current = controls;

    scene.add(new THREE.HemisphereLight(0xffffff, 0xe2e8f0, 0.9));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(14, 64),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.92, metalness: 0.02 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.55, 2.59, 72),
      new THREE.MeshBasicMaterial({ color: 0xcbd5e1, side: THREE.DoubleSide, transparent: true, opacity: 0.65 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.004;
    scene.add(ring);

    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 5.2),
      new THREE.MeshBasicMaterial({ map: createShadowTexture(), transparent: true, depthWrite: false }),
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.006;
    scene.add(shadowPlane);

    let carRoot: THREE.Object3D | null = null;
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/gltf/");
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      "/models/car.glb",
      (gltf) => {
        const model = gltf.scene;
        const rawBox = new THREE.Box3().setFromObject(model);
        const rawSize = new THREE.Vector3();
        rawBox.getSize(rawSize);
        if (rawSize.x > rawSize.z) model.rotation.y = Math.PI / 2;

        const rotatedBox = new THREE.Box3().setFromObject(model);
        const rotatedSize = new THREE.Vector3();
        rotatedBox.getSize(rotatedSize);
        const maxDim = Math.max(rotatedSize.x, rotatedSize.y, rotatedSize.z) || 1;
        model.scale.setScalar(4.4 / maxDim);

        const scaledBox = new THREE.Box3().setFromObject(model);
        const scaledCenter = new THREE.Vector3();
        scaledBox.getCenter(scaledCenter);
        model.position.x -= scaledCenter.x;
        model.position.z -= scaledCenter.z;
        model.position.y -= scaledBox.min.y;

        const zMap = new Map<THREE.Mesh, string>();
        const mMap = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
        const splitGroup = new THREE.Group();

        model.updateMatrixWorld(true);
        const finalBounds = new THREE.Box3().setFromObject(model);

        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            const zone = mapObjectToZoneKey(mesh);
            if (zone === "roof") {
              const parts = splitUnibodyMesh(mesh, finalBounds);
              for (const p of parts) {
                splitGroup.add(p.mesh);
                mMap.set(p.mesh, p.mesh.material);
                if (p.zone) zMap.set(p.mesh, p.zone);
              }
            } else {
              mMap.set(mesh, mesh.material);
              if (zone) zMap.set(mesh, zone);
            }
          }
        });

        meshZoneMapRef.current = zMap;
        originalMatMapRef.current = mMap;
        const carWrapper = new THREE.Group();
        carWrapper.add(model);
        carWrapper.add(splitGroup);
        scene.add(carWrapper);
        carRoot = carWrapper;
        setIsLoadingModel(false);
        setModelReadyTick((t) => t + 1);
      },
      undefined,
      () => setIsLoadingModel(false),
    );

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const getHitZone = (clientX: number, clientY: number): string | null => {
      if (!carRoot) return null;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObject(carRoot, true);
      for (const hit of hits) {
        const mapped = meshZoneMapRef.current.get(hit.object as THREE.Mesh);
        if (mapped) return mapped;
      }
      return null;
    };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };
    const handlePointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y) > 6) return;
      const zone = getHitZone(e.clientX, e.clientY);
      if (zone) onToggleZoneRef.current(zone);
    };
    const handlePointerMove = (e: PointerEvent) => {
      const zone = getHitZone(e.clientX, e.clientY);
      setHoveredZone(zone);
      renderer.domElement.style.cursor = zone ? "pointer" : "grab";
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      pmrem.dispose();
      dracoLoader.dispose();
      controls.dispose();
      renderer.dispose();
    };
  }, [height]);

  useEffect(() => {
    const zMap = meshZoneMapRef.current;
    const origMap = originalMatMapRef.current;
    if (zMap.size === 0) return;

    const zoneColors = new Map<string, number>();
    for (const dp of damagePoints) {
      if (dp.isResolved) continue;
      if (dp.severity === "major_damage") zoneColors.set(dp.zoneKey, 0xdc2626);
      else if (!zoneColors.has(dp.zoneKey)) zoneColors.set(dp.zoneKey, 0xf59e0b);
    }
    for (const sz of selectedZones) {
      if (!zoneColors.has(sz)) zoneColors.set(sz, 0x2563eb);
    }

    for (const [mesh, origMat] of origMap.entries()) {
      const zone = zMap.get(mesh);
      const highlightHex = zone ? zoneColors.get(zone) : undefined;
      if (!highlightHex) {
        mesh.material = origMat;
        continue;
      }
      mesh.material = Array.isArray(origMat)
        ? origMat.map((m) => tintMaterial(m, highlightHex, 0.55))
        : tintMaterial(origMat, highlightHex, 0.55);
    }
  }, [damagePoints, selectedZones, modelReadyTick]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {CAMERA_PRESET_BUTTONS.map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => handlePresetClick(btn.id)}
              className={`cursor-pointer rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                activePreset === btn.id
                  ? "border-revix-primary bg-revix-primary text-white"
                  : "border-revix-border bg-revix-white text-revix-secondary hover:bg-revix-surface hover:text-revix-dark"
              }`}
            >
              {isRtl ? btn.ar : btn.en}
            </button>
          ))}
        </div>

        {hoveredZone && (
          <span className="rounded-md border border-revix-border bg-revix-surface px-2.5 py-1 text-[11px] font-semibold text-revix-dark">
            {getZoneLabel(hoveredZone, isRtl)}
          </span>
        )}
      </div>

      <div className="relative overflow-hidden rounded-xl border border-revix-border bg-slate-50">
        {isLoadingModel && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50/85 text-xs font-semibold text-revix-secondary">
            {txt.loading}
          </div>
        )}
        <div ref={mountRef} className="w-full" style={{ height }} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-revix-secondary">
        <span>{txt.hint}</span>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
            {txt.selected}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            {txt.minor}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
            {txt.major}
          </span>
        </div>
      </div>
    </div>
  );
}
