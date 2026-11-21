import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFleetResourceRoute, vehicleHref, purchaseOrderHref } from '../src/lib/workspace/resourceRoutes.ts';

test('fleet resource routes are stable and shareable', () => {
  assert.deepEqual(parseFleetResourceRoute('/ar/workspace/fleet/vehicles/car-42/insurance'), {
    resource: 'vehicles', id: 'car-42', action: 'detail', tab: 'insurance',
  });
  assert.deepEqual(parseFleetResourceRoute('/workspace/fleet/purchase-orders/po-42/receive'), {
    resource: 'purchase-orders', id: 'po-42', action: 'receive', tab: 'overview',
  });
  assert.deepEqual(parseFleetResourceRoute('/workspace/fleet/purchase-orders/new'), {
    resource: 'purchase-orders', id: null, action: 'create', tab: 'overview',
  });
  assert.equal(vehicleHref('car 42', 'overview'), '/workspace/fleet/vehicles/car%2042');
  assert.equal(purchaseOrderHref('po-42', 'receive'), '/workspace/fleet/purchase-orders/po-42/receive');
});
