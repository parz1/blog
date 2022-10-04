```javascript
getImgTags(str = "") {
      var re = /<img\b.*?(?:\>|\/>)/gi;
      var a = re.exec(str);
      var x;
      if (a != null) {
        let srcReg = /(http|https){1}:\/\/[^"'\s]*/;
        x = srcReg.exec(a)[0];
      }
      return a;
    }
```

```javascript
removeHTMLTag(str) {
      str = str.replace(/<\/?[^>]*>/g, ""); //去除HTML tag
      str = str.replace(/[ | ]*\n/g, "\n"); //去除行尾空白 //str = str.replace(/\n[\s| | ]*\r/g,'\n'); //去除多余空行
      str = str.replace(/&nbsp;/gi, ""); //去掉&nbsp;
      str = str.replace(/\s/g, ""); //将空格去掉
      return str;
    }
```

