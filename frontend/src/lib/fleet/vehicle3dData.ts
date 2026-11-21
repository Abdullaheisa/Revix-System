import * as THREE from "three";

export interface VehicleZoneDef {
  key: string;
  en: string;
  ar: string;
}

export const VEHICLE_ZONES: VehicleZoneDef[] = [
  { key: "front_bumper", en: "Front Bumper", ar: "الإكصدام الأمامي" },
  { key: "headlight_left", en: "Front Left Headlight", ar: "الكشاف الأمامي يسار" },
  { key: "headlight_right", en: "Front Right Headlight", ar: "الكشاف الأمامي يمين" },
  { key: "hood", en: "Hood / Bonnet", ar: "الكبوت" },
  { key: "windshield", en: "Windshield", ar: "الزجاج الأمامي" },
  { key: "roof", en: "Roof", ar: "السقف" },
  { key: "rear_glass", en: "Rear Glass", ar: "الزجاج الخلفي" },
  { key: "trunk", en: "Trunk", ar: "الشنطة الخلفية" },
  { key: "taillight_left", en: "Rear Left Taillight", ar: "الفانوس الخلفي يسار" },
  { key: "taillight_right", en: "Rear Right Taillight", ar: "الفانوس الخلفي يمين" },
  { key: "rear_bumper", en: "Rear Bumper", ar: "الإكصدام الخلفي" },
  { key: "door_fl", en: "Front Left Door", ar: "الباب الأمامي يسار" },
  { key: "door_fr", en: "Front Right Door", ar: "الباب الأمامي يمين" },
  { key: "door_rl", en: "Rear Left Door", ar: "الباب الخلفي يسار" },
  { key: "door_rr", en: "Rear Right Door", ar: "الباب الخلفي يمين" },
  { key: "fender_fl", en: "Front Left Fender", ar: "الرفرف الأمامي يسار" },
  { key: "fender_fr", en: "Front Right Fender", ar: "الرفرف الأمامي يمين" },
  { key: "fender_rl", en: "Rear Left Fender", ar: "الرفرف الخلفي يسار" },
  { key: "fender_rr", en: "Rear Right Fender", ar: "الرفرف الخلفي يمين" },
  { key: "window_fl", en: "Front Left Window", ar: "زجاج الباب الأمامي يسار" },
  { key: "window_fr", en: "Front Right Window", ar: "زجاج الباب الأمامي يمين" },
  { key: "window_rl", en: "Rear Left Window", ar: "زجاج الباب الخلفي يسار" },
  { key: "window_rr", en: "Rear Right Window", ar: "زجاج الباب الخلفي يمين" },
  { key: "mirror_left", en: "Left Mirror", ar: "المرآة اليسرى" },
  { key: "mirror_right", en: "Right Mirror", ar: "المرآة اليمنى" },
  { key: "wheel_fl", en: "Front Left Wheel", ar: "العجلة الأمامية يسار" },
  { key: "wheel_fr", en: "Front Right Wheel", ar: "العجلة الأمامية يمين" },
  { key: "wheel_rl", en: "Rear Left Wheel", ar: "العجلة الخلفي يسار" },
  { key: "wheel_rr", en: "Rear Right Wheel", ar: "العجلة الخلفية يمين" },
];

export type CameraPreset = "iso" | "front" | "rear" | "left" | "right" | "top";

export const CAMERA_PRESETS: Record<CameraPreset, [number, number, number]> = {
  iso: [3.7, 1.75, 4.0],
  front: [0.01, 1.05, 5.1],
  rear: [0.01, 1.05, -5.1],
  left: [5.0, 1.15, 0.01],
  right: [-5.0, 1.15, 0.01],
  top: [0.01, 5.9, 0.35],
};

export const CAMERA_PRESET_BUTTONS: Array<{ id: CameraPreset; en: string; ar: string }> = [
  { id: "iso", en: "3D View", ar: "منظور 3D" },
  { id: "front", en: "Front", ar: "أمام" },
  { id: "rear", en: "Rear", ar: "خلف" },
  { id: "left", en: "Left", ar: "يسار" },
  { id: "right", en: "Right", ar: "يمين" },
  { id: "top", en: "Top", ar: "أعلى" },
];

export function getZoneLabel(zoneKey: string, isRtl: boolean): string {
  return VEHICLE_ZONES.find((z) => z.key === zoneKey)?.[isRtl ? "ar" : "en"] || zoneKey;
}

export function mapObjectToZoneKey(obj: THREE.Object3D): string | null {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    const n = cur.name.toLowerCase();
    if (n.includes("fender-front-l") || n.includes("wheel-fender-l")) return "fender_fl";
    if (n.includes("fender-front-r") || n.includes("wheel-fender-r")) return "fender_fr";
    if (n.includes("door-front-window-glass-l")) return "window_fl";
    if (n.includes("door-front-window-glass-r")) return "window_fr";
    if (n.includes("door-rear-window-glass-l") || n.includes("door-rear-trim-glass-l")) return "window_rl";
    if (n.includes("door-rear-window-glass-r") || n.includes("door-rear-trim-glass-r")) return "window_rr";
    if (n.includes("door-front-l")) return "door_fl";
    if (n.includes("door-front-r")) return "door_fr";
    if (n.includes("door-rear-l")) return "door_rl";
    if (n.includes("door-rear-r")) return "door_rr";
    if (n.includes("side-mirror") && n.includes("-l")) return "mirror_left";
    if (n.includes("side-mirror") && n.includes("-r")) return "mirror_right";
    if (n.includes("headlight")) return n.includes("-r") ? "headlight_right" : "headlight_left";
    if (n.includes("taillight")) return n.includes("-r") ? "taillight_right" : "taillight_left";
    if (n.includes("bumper-front") || n.includes("front-grill") || n.includes("honeycomb-grill")) {
      return "front_bumper";
    }
    if (n.includes("bumper-rear")) return "rear_bumper";
    if (n.includes("hood")) return "hood";
    if (n.includes("windshield")) return "windshield";
    if (n.includes("glass-rear")) return "rear_glass";
    if (n.includes("trunk")) return "trunk";
    if (n.includes("wheel_lf") || n.includes("ft.l") || n.includes("brake-caliper-front-l") || n.includes("brake-disc-front-l")) return "wheel_fl";
    if (n.includes("wheel_rf") || n.includes("ft.r") || n.includes("brake-caliper-front-r") || n.includes("brake-disc-front-r")) return "wheel_fr";
    if (n.includes("wheel_lr") || n.includes("bk.l") || n.includes("brake-caliper-rear-l") || n.includes("brake-disc-rear-l")) return "wheel_rl";
    if (n.includes("wheel_rr") || n.includes("bk.r") || n.includes("brake-caliper-rear-r") || n.includes("brake-disc-rear-r")) return "wheel_rr";
    if (n.includes("generic-tire-low_121") || n.includes("generic-wheel_122")) return "wheel_fl";
    if (n.includes("generic-tire-low.001") || n.includes("generic-wheel.001")) return "wheel_fr";
    if (n.includes("generic-tire-low.002") || n.includes("generic-wheel.002")) return "wheel_rl";
    if (n.includes("generic-tire-low.003") || n.includes("generic-wheel.003")) return "wheel_rr";
    if (n.includes("sedan-unibody")) return "roof";
    cur = cur.parent;
  }
  return null;
}
