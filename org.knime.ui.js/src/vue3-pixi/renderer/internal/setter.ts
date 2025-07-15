/* eslint-disable func-style */
import { isObject } from "@antfu/utils";
import { effectScope, nextTick, watchEffect } from "vue";

export function setObjectProperty(
  inst: any,
  key: string,
  prevValue: any,
  nextValue: any,
) {
  const scope = effectScope();
  function update() {
    if (prevValue && nextValue !== prevValue) {
      inst[`__vp_scope_${key}`]?.stop();
    }
    for (const [setKey, value] of Object.entries(nextValue)) {
      if (inst[key]) {
        inst[key][setKey as any] = value;
      } else {
        consola.warn("Vue Pixi renderer:: Failed trying to set property", {
          inst,
          key,
          value,
        });
      }
    }
  }
  scope.run(() => {
    watchEffect(update);
    nextTick(update);
  });
  inst.on?.("destroyed", () => scope.stop());
  inst[`__vp_scope_${key}`] = scope;
  return true;
}

export function setPointProperty(
  inst: any,
  name: string,
  key: string,
  prevValue: any,
  nextValue: any,
) {
  switch (key) {
    case name:
      if (isObject(nextValue)) {
        return setObjectProperty(inst, name, prevValue, nextValue);
      } else {
        return callInstanceSetter(inst, name, nextValue);
      }
    case `${name}X`:
      return setPropertyValue(
        inst[name],
        "x",
        () => (inst[name].x = nextValue),
      );
    case `${name}Y`:
      return setPropertyValue(
        inst[name],
        "y",
        () => (inst[name].y = nextValue),
      );
  }

  return false;
}

export function setPropertyValue(inst: any, key: string, setter: () => void) {
  const initKey = `_vp_initkey_${key}`;
  function update() {
    setter();
  }

  if (!inst) {
    console.warn(
      `Invalid property ${key}. Unable to bind to Pixi object instance`,
    );
    return;
  }

  if (!inst[initKey]) {
    Reflect.set(inst, initKey, true);
    nextTick(update);
  } else {
    update();
  }
  return true;
}

export function callInstanceSetter(inst: any, key: string, value: any | any[]) {
  const [v1, v2, v3] = Array.isArray(value) ? value : [value, value, value];
  setPropertyValue(inst[key], key, () => inst[key]?.set(v1, v2, v3));
  return true;
}

export function setSkipFirstValue(inst: any, key: string, setter: () => void) {
  if (inst[`_vp_skip_first_set_${key}`]) {
    setPropertyValue(inst, key, setter);
  } else {
    inst[`_vp_skip_first_set_${key}`] = true;
  }
  return true;
}
