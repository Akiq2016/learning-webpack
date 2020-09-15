import utils from "./util";

Page({
  data: {
    logs: [],
  },
  onLoad() {
    utils();
    this.setData({
      logs: (wx.getStorageSync("logs") || []).map(function abc(log) {
        return 2; // formatTime(new Date(log));
      }),
    });
  },
});
