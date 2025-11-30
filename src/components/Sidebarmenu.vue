<template>
  <template v-for="(secRoutes, id) in childrenRoutes" :key="id">
    <el-menu-item
      v-if="!secRoutes.children || secRoutes.children.length == 0"
      :index="secRoutes.name"
      :route="secRoutes"
    >
      <template #title>
        <el-icon>
          <i
            v-if="secRoutes.meta.iconclass"
            :class="secRoutes.meta.iconclass"
          ></i>
        </el-icon>
        <span>{{ secRoutes.meta.titles }}</span>
      </template>
    </el-menu-item>
    <el-sub-menu v-else :index="secRoutes.name" :route="secRoutes">
      <template #title>
        <el-icon>
          <i
            v-if="secRoutes.meta.iconclass"
            :class="secRoutes.meta.iconclass"
          ></i>
        </el-icon>
        <span>{{ secRoutes.meta.titles }}</span>
      </template>
      <Sidebarmenu :childrenRoutes="secRoutes.children"></Sidebarmenu>
    </el-sub-menu>
  </template>
</template>

<script>
export default {
  name: "Sidebarmenu",
  props: {
    childrenRoutes: {
      default: [],
    },
  },
};
</script>