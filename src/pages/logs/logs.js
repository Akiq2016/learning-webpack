import { formatTime } from "../../utils/util";

Page({
  data: {
    logs: [1, 2, 3],
  },
  onLoad() {
    this.setData({
      logs: (wx.getStorageSync("logs") || []).map(function (log) {
        return formatTime(new Date(log));
      }),
    });
  },
});
