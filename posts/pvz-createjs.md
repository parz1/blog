---
title: 'PVZ createjs ver'
date: '20202-01-08'
---

# PVZ(createjs.ver) 

### Usage

下载node.js和yarn后，本地运行

```
yarn install
yarn start
```

### Structure

项目图示

![](https://s3.bmp.ovh/imgs/2022/01/9560be40a6cd1ead.png)

项目结构

![](https://s3.bmp.ovh/imgs/2022/01/96ebd7587d6a7d34.png)

### 状态树 Store

初步构想是模仿现代前端建立状态树，一棵全局状态树来控制全局多处用到的数据，于是写了类似Redux的一个状态管理器，状态分为两部分：world和game，world负责全局（UI）部分的state管理，而game负责游戏内状态管理（挂载需全局处理的游戏对象）。如添加一个僵尸，store.dispatch一个事件"ZOMBIE_ADDED"给store，再通过playload挂载到state.game里，再通过subscribe函数实现添加僵尸相关逻辑。通过这样管理的方式，在状态复杂多变时，可以实现低耦合。

![](https://s3.bmp.ovh/imgs/2022/01/e44287c216d95b6b.png)

部分核心代码展示如下

```javascript
export class Store {
  constructor(reducers = {}, initialState = {}) {
    this.subscribers = []
    this.reducers = reducers
    this.state = this.reduce(initialState, {})
    this.action = {}
  }
  get v() {
    return this.state
  }
  subscribe(fn) {
    this.subscribers = [...this.subscribers, fn]
    fn(this.v, this.action)
    return () => {  // instead of additional unsubscribe fn
      this.subscribers = this.subscribers.filter(sub => sub !== fn)
    }
  }
  dispatch(action) {
    console.log(action)
    this.action = action
    this.state = this.reduce(this.state, this.action)
    this.subscribers.forEach(fn => fn(this.value, this.action))
  }

  reduce(state, action) {
    const newState = {}
    for(const prop in this.reducers) {
      newState[prop] = this.reducers[prop](state[prop], action)
    }
    return newState
  }
}
```

### FSM实现僵尸动画控制 Zombie

在这里实现僵尸类后，用fsm状态机控制动画，逻辑则在僵尸类里实现。这样可以用状态机将动画代码和逻辑代码分开，越是复杂的僵尸，则越需要状态机分离动画控制代码和对象逻辑代码，并且会大大减少bug的发生，易于调试。

比如僵尸的状态逻辑：

![](https://s3.bmp.ovh/imgs/2022/01/25e18e17d42ea4fd.png)

Zombie FSM核心代码如下：

```javascript
export const ZombieFSM = new StateMachine.factory({
  init: 'walk',
  transitions: [
    { name: 'attack', from: 'walk', to: 'attacking' },
    { name: 'burn', from: ['walk', 'attacking'], to: 'burned' },
    { name: 'die', from: ['walk', 'attacking', 'burned', 'dead'], to: 'dead' },
    { name: 'walk', from: ['attacking'], to: 'walk'}
  ],
  data(instance, spriteSheet) {
    this.instance = instance
    this.spriteSheet = spriteSheet
  },
  methods: {
    onAttack(lifecycle) {
      console.log('FSM TRANSITION: ' + lifecycle.transition)
      this.instance.removeAllChildren()
      this.instance.addChild(new createjs.Sprite(this.spriteSheet['zombieAttackingS'], 'play'))
    },
    onBurn(lifecycle) {
      console.log('FSM TRANSITION: ' + lifecycle.transition)
      this.instance.removeAllChildren()
      this.instance.addChild(new createjs.Sprite(this.spriteSheet['zombieBurnedS'], 'play'))
    },
    onWalk(lifecycle) {
      console.log('FSM TRANSITION: ' + lifecycle.transition)
      this.instance.removeAllChildren()
      this.instance.addChild(new createjs.Sprite(this.spriteSheet['zombie1S'], 'play'))
    },
    onDie(lifecycle) {
      console.log(lifecycle.transition)
      this.instance.removeAllChildren()
      const body = new createjs.Sprite(this.spriteSheet['zombieLostHeadS'], 'play')
      const head = new createjs.Sprite(this.spriteSheet['zombieHeadS'], 'play')
      const dieBody = new createjs.Sprite(this.spriteSheet['zombieDieS'], 'play')
      head.x = 30
      this.instance.addChild(body)
      this.instance.addChild(head)
      setTimeout(() => {
        // this.instance.removeAllChildren()
        this.instance.removeChild(body)
        this.instance.addChild(dieBody)
      }, 1000);
    }
  },
})

```

通过Platform控制植物的位置。

```javascript
export class PlatForm extends GameObject {
  constructor(store) {
    super(store)
    this.ground = []
    this.x = 250
    this.y = 180
    this.addChild(new createjs.Text('HELLO'))
    this.timer = null
  }
  addPlant(x, y, plant) {
    this.store.dispatch({ type: 'ADD_PLANT', payload: plant })
    plant.x = (x-1) * 80
    plant.y = (y-1) * 110
    plant.init()
    this.addChild(plant)
  }
  addZombie(y, zombie) {
    this.store.dispatch({ type: 'ADD_ZOMBIE', payload: zombie })
    zombie.x = 600
    zombie.y = (y-1) * 110 - 50
    zombie.init()
    this.addChild(zombie)
  }
}
```



