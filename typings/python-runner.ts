export type PythonRunnerPhase =
  | 'loading-runtime'
  | 'loading-packages'
  | 'running'
  | 'ready'

export type PythonRunnerRequest = {
  type: 'run'
  id: number
  code: string
}

export type PythonRunnerResponse =
  | {
      type: 'status'
      id: number
      phase: PythonRunnerPhase
    }
  | {
      type: 'stream'
      id: number
      stream: 'stdout' | 'stderr'
      text: string
    }
  | {
      type: 'result'
      id: number
      value: string
    }
  | {
      type: 'figure'
      id: number
      index: number
      svg: string
    }
  | {
      type: 'error'
      id: number
      message: string
    }
