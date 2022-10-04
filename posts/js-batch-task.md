```js
class BatchTask {
  constructor(dataList, limit, asyncTask) {
    this.count = 0;
    this.dataList = dataList;
    this.limit = limit;
    this.asyncTask = asyncTask;
    this.taskPool = [];
    while (limit--) {
      this.taskPool.push(this.task(dataList, asyncTask));
    }
    return Promise.all(this.taskPool)
  }

  task(dataList) {
    return new Promise((resolve, reject) => {
      this.asyncTask(dataList.shift())
        .then(() => {
          if (dataList.length) resolve(this.task(dataList));
          else resolve("done");
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  cancel() {}
}
```

