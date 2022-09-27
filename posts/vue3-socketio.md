---
title: 'Use Socket.io in Tauri'
date: '2022-09-27'
---

## Plugin

```typescript
// plugins/io.ts TODO: build a code part route cpnt in blog
import io from 'socket.io-client'
export default {
  install: (app: any, { connection, options }: any) => {
    const socket = io(connection, options)
    app.config.globalProperties.$socket = socket
    app.provide('socket', socket)
  },
}
```



## Episodes encountered

### Eslint error

```typescript
const socket: Socket = inject('socket') as Socket
socket.on('connection', () => {
  console.log('connected')
})
```

