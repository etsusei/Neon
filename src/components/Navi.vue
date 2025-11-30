<template>
  <div>
    <el-menu
      class="el-menu-vertical-demo"
      mode="vertical"
      :router="true"
      :default-active="$route.name"
      active-text-color="wheat"
      text-color="#fff"
      style="height: 900px; width: 200px"
      background-color="#545c64"
      :collapse="isCollapse"
    >
      <Sidebarmenu :childrenRoutes="routes"></Sidebarmenu>
      <el-menu-item>
        <div id="side_collapse_mask" @click.stop="OnCollapseClick($event)">
          <div class="line_collapse"></div>
          <i
            :class="['fa', isCollapse ? 'fa-angle-right' : 'fa-angle-left']"
          ></i>
        </div>
      </el-menu-item>
    </el-menu>
  </div>
</template>

<script>
import Sidebarmenu from "@/components/Sidebarmenu.vue";
export default {
  components: {
    Sidebarmenu,
  },
  data() {
    return {
      routes: [],
      isCollapse:false,
      hasCollapse:true,
      sideBarWidth:200
    };
  },
  created() {
    this.getRoutes();
    console.log(this.$route.matched[0].children);
  },
  methods: {
    getRoutes() {
      this.routes = this.$route.matched[0].children;
    },
    OnCollapseClick() {
      this.isCollapse = !this.isCollapse;
      this.sideBarWidth = this.isCollapse ? 650 : 200;
    },
  },
};
</script>
<style lang='scss' scoped>
$collapse-btn-width: 18px; 
$border_color: #c4c4c4; 
#side_collapse_mask {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;

  i {
    position: absolute;
    display: inline-block;
    width: $collapse-btn-width;
    height: $collapse-btn-width;
    border-radius: $collapse-btn-width;
    line-height: $collapse-btn-width;
    text-align: center;
    background-color: white;
    border: $border_color solid 1px;
    color: $border_color;
    font-size: 14px;
  }

  &:hover i {
    background-color: #ecf5ff;
  }

  div {
    position: relative;
    width: calc(100% - 16px);
    height: 1px;
    background-color: #e6e6e6;
  }
}
.el-menu-vertical-demo:not(.el-menu--collapse) {
  width: 200px;
  min-height: 400px;
}
</style>