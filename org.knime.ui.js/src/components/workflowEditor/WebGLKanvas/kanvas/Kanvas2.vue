<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef } from "vue";
import { Application, Assets, Graphics, Sprite } from "pixi.js";

const rootEl = useTemplateRef("root");

let app: Application;

onMounted(async () => {
  // Create a new application
  app = new Application();

  // Initialize the application
  await app.init({ antialias: true, resizeTo: window });

  const texture = await Assets.load("https://pixijs.com/assets/bunny.png");

  // Append the application canvas to the document body
  rootEl.value!.appendChild(app.canvas);

  for (let i = 0; i < 30000; i++) {
    const graphics = new Graphics();
    const bunny = new Sprite(texture);

    bunny.x = 100;
    bunny.y = 100;

    // Rectangle
    graphics.rect(50 + i * 10, 50, 100, 100);
    graphics.fill(0xde3249);
    graphics.stroke({ width: 2, color: 0xfeeb77 });

    app.stage.addChild(graphics);
    app.stage.addChild(bunny);
  }
});

onUnmounted(() => {
  app.destroy(
    { removeView: true, releaseGlobalResources: true },
    {
      children: true,
      context: true,
      style: true,
      texture: true,
      textureSource: true,
    },
  );
});
</script>

<template>
  <div ref="root">works</div>
</template>
