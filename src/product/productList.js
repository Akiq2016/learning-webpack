// import { flow } from 'lodash';

// const delay = (t = 0) => new Promise((resolve) => setTimeout(resolve, t));

//获取应用实例
const app = getApp(); // eslint-disable-line no-undef
import utils from "./util";
// import utils2 from "../../utils/util2";

Page({
  data: {
    motto: "Hello List",
    userInfo: {},
  },
  //事件处理函数
  bindViewTap() {
    wx.navigateTo({
      url: "./productDetail",
    });
  },
  onLoad() {
    utils();
    // utils2();
    // await delay();

    // const log = flow(() => {
    // 	console.log('onLoad');
    // });

    // log();

    //调用应用实例的方法获取全局数据
    app.getUserInfo((userInfo) => {
      //更新数据
      this.setData({ userInfo });
    });
  },
});
