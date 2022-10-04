# JavaScript 滚动系列

网站总是需要各种各样的滚动特效

本文总和一下





```javascript
onScroll(e) {
      let el = this.$refs.examList;
      // console.log(window.scrollY, "vs", el.scrollHeight - 300);
      if (el.scrollHeight - 300 <= window.scrollY) {
        console.log("yes");
      }
    },
```

