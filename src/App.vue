<template>
  <router-view />
  <div id="cesiumContainer"></div>
</template>
<script setup>
import * as Cesium from "cesium";
import { onMounted } from "vue";
import { load3dtiles, update3dtiles } from "./tool/load3D";
let viewer;
Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5ZWZlNmFmNS0yNTkxLTQ2NzEtYjk4NS1lNGY5NWM1OTc5MmYiLCJpZCI6MjA1MTk1LCJpYXQiOjE3MTE2NzU4OTJ9.O9J1G_tirf33A-GKVOhxk1h9lWH08IZTnMOf-y8XS_U";
onMounted(() => {
  viewer = new Cesium.Viewer("cesiumContainer", {
    geocoder: false,
    homeButton: false, //是否显示首页位置工具
    sceneModePicker: false, //是否显示视角模式切换工具
    baseLayerPicker: false, //是否显示默认图层选择工具
    navigationHelpButton: false, //是否显示导航帮助工具
    animation: false, //是否显示动画工具
    timeline: false, //是否显示时间轴工具
    fullscreenButton: false, //是否显示全屏按钮工具
  });
  load3dtiles(viewer, "src/assets/b3dm/tileset.json", (tileset) => {
    viewer.zoomTo(tileset);
    update3dtiles(tileset);
  });
});
</script>
<style lang="scss">
#cesiumContainer {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
}
</style>
