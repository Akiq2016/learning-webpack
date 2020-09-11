import { formatTime } from "../../utils/util";
import utils from "./util";
import utils2 from "../../utils/util2";

Page({
  data: {
    logs: [],
  },
  onLoad() {
    utils();
    utils2();
    this.setData({
      logs: (wx.getStorageSync("logs") || []).map(function abc(log) {
        return formatTime(new Date(log));
      }),
    });
  },
});
