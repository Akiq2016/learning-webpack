const {
    SyncHook, // tapAsync、tapPromise are unavailable here
    SyncBailHook,
    SyncWaterfallHook,
    SyncLoopHook,
    AsyncParallelHook,
    AsyncParallelBailHook,
    AsyncSeriesHook,
    AsyncSeriesBailHook,
    AsyncSeriesWaterfallHook
} = require("tapable");

// const sync = new SyncHook([1, 3, 4, 5, 6])
// console.log(sync)
// SyncHook {
//     _args: [1,3,4,5,6],
//     taps: [],
//     interceptors: [],
//     call: [Function: lazyCompileHook],
//     promise: [Function: lazyCompileHook],
//     callAsync: [Function: lazyCompileHook],
//     _x: undefined }

// hook tap => call
// hook tapAsync => callAsync
// hook tapPromise => promise
class Car {
    constructor() {
        this.hooks = {
            accelerate: new SyncHook(["newSpeed"]),
            brake: new SyncHook(),
            calculateRoutes: new AsyncParallelHook(["source", "target"])
        };
    }

	setSpeed(newSpeed) {
		this.hooks.accelerate.call(newSpeed);
	}

	useNavigationSystemPromise(source, target) {
		return this.hooks.calculateRoutes.promise(source, target).then(_ => {
			console.log('calculateRoutes.promise: ', _);
		});
	}

	useNavigationSystemAsync(source, target, callback) {
        // can call asyncTap (sync)Tap
        this.hooks.calculateRoutes.callAsync(source, target, err => {
            console.log('calculateRoutes.callAsync: ', err)
		});
	}
}

const car = new Car
car.hooks.brake.tap("WarningLampPlugin", () => console.log('!!WarningLampPlugin'));

// console.log(car.hooks.brake.taps)
// [ { type: 'sync', fn: [Function], name: 'WarningLampPlugin' } ]

// console.log(car.hooks.calculateRoutes._args)
// [ 'source', 'target', 'routesList' ]

car.hooks.accelerate.tap("LoggerPlugin", newSpeed => console.log(`Accelerating to ${newSpeed}`));
car.hooks.accelerate.tap("LoggerPlugin2", newSpeed => console.log(`Accelerating to ${newSpeed}]]]]]]]`));

car.hooks.calculateRoutes.tapPromise("GoogleMapsPlugin", (source, target) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log('promise: ', {source, target})
            resolve({source, target})
        }, 2000)
    })
});
car.hooks.calculateRoutes.tapAsync("BingMapsPlugin", (source, target, callback) => {
    console.log('tapAsync: ', {source, target, callback})
    callback()
});
car.hooks.calculateRoutes.tap("CachedRoutesPlugin", (source, target) => {
    console.log('tap: ', {source, target})
})

// console.log(car)
// Car {
//     hooks:
//      { accelerate:
//         SyncHook {
//           _args: [Array],
//           taps: [Array],
//           interceptors: [],
//           call: [Function: lazyCompileHook],
//           promise: [Function: lazyCompileHook],
//           callAsync: [Function: lazyCompileHook],
//           _x: undefined },
//        brake:
//         SyncHook {
//           _args: [],
//           taps: [Array],
//           interceptors: [],
//           call: [Function: lazyCompileHook],
//           promise: [Function: lazyCompileHook],
//           callAsync: [Function: lazyCompileHook],
//           _x: undefined },
//        calculateRoutes:
//         AsyncParallelHook {
//           _args: [Array],
//           taps: [Array],
//           interceptors: [],
//           call: undefined,
//           promise: [Function: lazyCompileHook],
//           callAsync: [Function: lazyCompileHook],
//           _x: undefined } } }
// console.log(car.hooks.calculateRoutes)
// AsyncParallelHook {
//     _args: [ 'source', 'target', 'routesList' ],
//     taps:
//      [ { type: 'promise', fn: [Function], name: 'GoogleMapsPlugin' },
//        { type: 'async', fn: [Function], name: 'BingMapsPlugin' },
//        { type: 'sync', fn: [Function], name: 'CachedRoutesPlugin' } ],
//     interceptors: [],
//     call: undefined,
//     promise: [Function: lazyCompileHook],
//     callAsync: [Function: lazyCompileHook],
//     _x: undefined }

// console.log(car.setSpeed('123123132123'))

// console.log()
// car.useNavigationSystemAsync('i am source', 'i am target', () => {console.log('a callback')})
car.useNavigationSystemPromise('i am source', 'i am target')