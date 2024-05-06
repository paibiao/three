<template>
  <el-card class="setbuild">
    <template #header>
      <div class="card-header">
        <span style="font-weight: 600; font-size: 18px">楼房分户</span>
        <span @click="reset">
          <Refresh style="width: 25px;float:right;cursor: pointer;" />
        </span>
      </div>
    </template>
    <div>
      <el-steps style="max-width: 600px" finish-status="success" :active="data.active" align-center>
        <el-step title="区域绘制" />
        <el-step title="户型切分" />
        <el-step title="楼房分层" />
      </el-steps>
      <div style="margin:30px 10px">
        <div style="height:40px">
          <span>绘制户型：</span>
          <span @click="drawPolygon" class="myIcon" v-show="data.active==0">
            <FullScreen />绘制图形
          </span>
          <span @click="drawpolyline" class="myIcon" v-show="data.active==1">
            <Scissor />裁切图形
          </span>
          <span @click="drwaPoint" class="myIcon" v-show="data.active==2">
            <Histogram />楼层分层
          </span>
          <span class="buildnum" v-show="data.heightArr.length==3">
            楼层数：<el-input type="number" v-model="data.floorNum" />
          </span>
        </div>
        <div class="textInput">
          <el-input v-model="inputArr[0]" />
          <el-input v-model="inputArr[1]" />
          <el-input style="width: 40%;" v-model="inputArr[2]" />
          <el-input v-show="data.active==1" style="width: 40%;" v-model="inputArr[3]" />
        </div>
        <div class="textInput" v-for="(item,index) in data.unitArr" :key="index">
          <el-input disabled v-model="item[0]" />
          <el-input v-model="data.buildName" />
          <el-input style="width: 40%;" v-model="item[1]" />
          <img @click="toFlash(item[2])" src="/src/assets/img/position.png" v-show="data.active==1">
        </div>
        <div v-show="data.heightArr.length==3" class="pointList">
          最低点：<el-input v-model="data.heightArr[0]" />
          分割点：<el-input v-model="data.heightArr[1]" />
          最高点：<el-input v-model="data.heightArr[2]" />
        </div>
        <el-button v-show="data.active==3" @click="toAddHouse" type="primary" style="margin:12px;float:right">生成数据</el-button>
        <el-button v-if="data.active<2" @click="next" type="info" style="margin:12px;float:right">下一步</el-button>
        <el-button @click="toLayer" v-else type="warning" style="margin:12px;float:right">楼房分层</el-button>
      </div>
    </div>
  </el-card>
</template>
<script setup>
import {
  FullScreen,
  Scissor,
  Histogram,
  Refresh,
  Message,
} from "@element-plus/icons-vue";
import * as turf from '@turf/turf'
import * as Cesium from "cesium";
import { addHouse } from '../api/houseApi'
import { onMounted, getCurrentInstance, reactive, onUnmounted } from "vue";
import { toDraw, endDraw } from '../tool/draw'
import { ElMessage, LEFT_CHECK_CHANGE_EVENT } from 'element-plus'
import polygonCut from '../tool/polygonCut'
const { appContext } = getCurrentInstance()
const global = appContext.config.globalProperties
const inputArr = ['分户坐标', '地址前缀', '单位', '定位']
let polygonEntity, polygonGeojsonArr, polygonAllGeojson
let houseList = []
const data = reactive({
  active: 0,
  unitArr: [],
  heightArr: [],
  buildName: 'xx小区xx栋',
  floorNum: 0
})

onUnmounted(() => {
  endDraw()
  global.$viewer.entities.removeAll()
  houseList.length && houseList.forEach(item => {
    global.$viewer.scene.primitives.remove(item)
  })
  houseList = []
})

const toAddHouse = () => {
  let polygonJson = JSON.stringify(polygonAllGeojson.geometry);
  let polygonJsonArr = polygonGeojsonArr
    ? polygonGeojsonArr.features.map((item) => {
      return JSON.stringify(item.geometry);
    })
    : [];
  let unitArr = data.unitArr.map((item) => {
    return Number(item[1]);
  });
  let heightArr = data.heightArr.map((item) => {
    return Number(item);
  });
  addHouse({
    polygonJson,
    polygonJsonArr,
    unitArr,
    heightArr,
    name: data.buildName,
    floorNum: Number(data.floorNum)
  }).then(res => {
    if (res.code == 200) {
      reset()
      ElMessage.success('分户成功！')
    }
  })
}

const reset = () => {
  endDraw()
  global.$viewer.entities.removeAll()
  houseList.length && houseList.forEach(item => {
    global.$viewer.scene.primitives.remove(item)
  })
  houseList = []
  data.active = 0
  data.unitArr = []
  data.heightArr = []
  data.buildName = 'xx小区xx栋'
  data.floorNum = 0
  polygonEntity = null
  polygonGeojsonArr = null
  polygonAllGeojson = null
}


const toLayer = () => {
  if (!data.floorNum) {
    ElMessage.error('请输入楼层数!')
    return
  }
  global.$viewer.entities.removeAll()
  houseList.length && houseList.forEach(item => {
    global.$viewer.scene.primitives.remove(item)
  })
  houseList = []
  let height, extrudedHeight
  let midHeight = Number(data.heightArr[1])
  let itemHeight = (data.heightArr[2] - data.heightArr[1]) / (data.floorNum - 1)
  data.unitArr.forEach(item => {
    const car3_ps = item[2].polygon.hierarchy.getValue().positions
    for (let i = 0; i < data.floorNum; i++) {
      if (i == 0) {
        height = data.heightArr[0]
        extrudedHeight = data.heightArr[1]
      } else {
        height = midHeight + (i - 1) * itemHeight
        extrudedHeight = midHeight + i * itemHeight
      }
      let primitive = new Cesium.ClassificationPrimitive({
        geometryInstances: new Cesium.GeometryInstance({
          geometry: new Cesium.PolygonGeometry({
            polygonHierarchy: new Cesium.PolygonHierarchy(car3_ps),
            height,
            extrudedHeight,
          }),
          attributes: {
            color: Cesium.ColorGeometryInstanceAttribute.fromColor(
              Cesium.Color.fromRandom({ alpha: 0.3 }) //颜色
            ),
          },
        }),
        classificationType: Cesium.ClassificationType.CESIUM_3D_TILE,
      });
      global.$viewer.scene.primitives.add(primitive);
      houseList.push(primitive)
    }
  })
  if (houseList.length > 0) {
    data.active = 3
  }
}

const next = () => {
  if (data.active == 0 && !polygonEntity) {
    ElMessage.error('请先绘制区域！')
    return
  } else if (data.active == 1) {
    endDraw()
  }
  data.active++
}

// 不能连续点击
const toFlash = (entity) => {
  if (!entity.polygon.material.color._value) return
  let initColor = entity.polygon.material.color._value
  let x = 1
  let flog = true
  entity.polygon.material = new Cesium.ColorMaterialProperty(
    new Cesium.CallbackProperty(() => {
      if (flog) {
        x = x - 0.05;
        if (x <= 0) {
          flog = false;
        }
      } else {
        x = x + 0.05;
        if (x >= 1) {
          flog = true;
        }
      }
      return Cesium.Color.RED.withAlpha(x);
    }, false)
  );
  setTimeout(() => {
    entity.polygon.material = initColor
  }, 1500)
}

const drwaPoint = () => {
  for (let i = global.$viewer.entities.values.length - 1; i >= 0; i--) {
    let item = global.$viewer.entities.values[i]
    item.point && global.$viewer.entities.remove(item)
  }
  data.heightArr = []
  ElMessage.info('请绘制底层、二楼以及顶楼高度点')
  toDraw(global.$viewer, 'point', (res) => {
    const height = Cesium.Cartographic.fromCartesian(res.position._value).height
    data.heightArr.push(height)
    if (data.heightArr.length == 3) {
      data.heightArr.sort((a, b) => { return a - b })
      endDraw()
    }
  })
}

const drawpolyline = () => {
  global.$viewer.entities.removeAll()
  global.$viewer.entities.add(polygonEntity)
  data.unitArr = [[
    polygonAllGeojson.geometry.coordinates.toString(),
    1,
    polygonEntity
  ]]
  ElMessage.info('请绘制线段,右键结束绘制')
  toDraw(global.$viewer, 'line', (res) => {
    global.$viewer.entities.remove(res)
    let car3_ps = res.polyline.positions.getValue()
    let arr = []
    for (let i = 0; i < car3_ps.length; i++) {
      let _cartographic = Cesium.Cartographic.fromCartesian(car3_ps[i]);
      let _lat = Cesium.Math.toDegrees(_cartographic.latitude);
      let _lng = Cesium.Math.toDegrees(_cartographic.longitude);
      arr.push([_lng, _lat]);
    }
    const lineGeoJson = turf.lineString(arr);
    try {
      polygonGeojsonArr = polygonCut(polygonAllGeojson, lineGeoJson)
      if (polygonGeojsonArr.features.length == 1) {
        ElMessage.error('请切割绘制区域！')
        return
      }
    } catch (error) {
      ElMessage.error(error)
      return
    }
    Cesium.GeoJsonDataSource.load(polygonGeojsonArr, { clampToGround: true }).then(info => {
      global.$viewer.entities.removeAll()
      data.unitArr = []
      info.entities.values.forEach((item, index) => {
        item.polygon.material = Cesium.Color.fromRandom({ alpha: 0.5 })
        global.$viewer.entities.add(item)
        data.unitArr.push([
          polygonGeojsonArr.features[index].geometry.coordinates.toString(),
          data.unitArr.length + 1,
          item
        ])
      })
    })
  })
}


const drawPolygon = () => {
  polygonEntity = null
  global.$viewer.entities.removeAll()
  data.unitArr = []
  ElMessage.info('请绘制图形,右键结束绘制')
  toDraw(global.$viewer, 'polygon', (res) => {
    polygonEntity = res
    const car3_ps = res.polygon.hierarchy.getValue().positions
    let arr = []
    for (let i = 0; i < car3_ps.length; i++) {
      let _cartographic = Cesium.Cartographic.fromCartesian(car3_ps[i]);
      let _lat = Cesium.Math.toDegrees(_cartographic.latitude);
      let _lng = Cesium.Math.toDegrees(_cartographic.longitude);
      arr.push([_lng, _lat]);
    }
    arr.push(arr[0])
    polygonAllGeojson = turf.polygon([arr]);
    data.unitArr.push([
      polygonAllGeojson.geometry.coordinates.toString(),
      1,
      res
    ])
  })
}


onMounted(() => {

})
</script>
<style lang="scss">
.setbuild {
  width: 25%;
  position: absolute;
  top: 4%;
  left: 4%;
  z-index: 999;

  .buildnum {
    float: right;
    width: 34%;

    .el-input {
      width: 50%;
    }
  }

  .myIcon {
    cursor: pointer;

    svg {
      width: 20px;
      position: relative;
      top: 5px;
      margin-right: 3px;
    }
  }

  .textInput {
    display: flex;

    .el-input {
      margin: 5px 1%;

      .el-input__inner {
        text-align: center;
      }
    }

    img {
      margin: 10px 4.6%;
      width: 14%;
      height: 25px;
      cursor: pointer;
    }
  }

  .pointList {
    display: flex;
    font-size: 15px;
    margin: 20px 0;
    line-height: 30px;

    .el-input {
      width: 15%;
      margin-right: 4%;
    }
  }
}
</style>
