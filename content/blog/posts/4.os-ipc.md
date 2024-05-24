---
title: 进程间通信
description: 进程的三种通信方式
published: 2024/05/06
---

## 实验题目

### 利用 linux 的消息队列通信机制实现两个进程间的通信

>编写程序创建两个进程：sender 和 receive ，其中 sender运行函数 sender()，它创建一个消息队列，然后，循环等待用户通过终端输入一串字符，将这串字符通过消息队列发送给 receiver ，直到用户输入“exit”为止；最后，它向 receiver 发送消息“end”，并且等待 receiver 的应答，等到应答消息后，将接收到的应答信息显示在终端屏幕上，删除相关消息队列，结束程序的运行。 Receiver 运行 receive()，它通过消息队列接收来自sender 的消息，将消息显示在终端屏幕上，直至收到内容为“end”的消息为止，此时，它向 sender 发送一个应答消息“over”，结束程序的运行。 

先上结果

[![CleanShot 2024-05-06 at 16.25.10@2x.png](https://g.imgtg.com/uploads/7247/663893be11fa2.png)](https://g.imgtg.com/uploads/7247/663893be11fa2.png)

**打印的消息同步问题**

最开始的版本，Sender 发送消息到 Receiver 后，会率先在屏幕上打印出 Input Message: 像这样

[![CleanShot 2024-05-06 at 16.36.59@2x.png](https://g.imgtg.com/uploads/7247/66389689af813.png)](https://g.imgtg.com/uploads/7247/66389689af813.png)

**解决办法**

再建一个消息队列，负责消息的同步，Sender 在发送之后，需要接收到 Receiver 的 sync 消息才能继续。

```c
#define QUEUE_NAME  "/ipc_queue"
#define QUEUE_SYNC  "/ipc_sync_queue"

// sender
// ...
// Wait for the receiver to be ready
if (mq_receive(mq_sync, buffer, MAX_SIZE, NULL) == -1) {
    perror("mq_receive");
    break;
}
// receiver
// print result
printf("Receiver::Received: %s\n", buffer);
// Indicate ready for the next message
if (mq_send(mq_sync, MSG_READY, strlen(MSG_READY) + 1, 0) == -1) {
    perror("mq_send");
    break;
}

```


### 全部代码

::CodeView
```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <mqueue.h>

#define QUEUE_NAME  "/ipc_queue"
#define QUEUE_SYNC  "/ipc_sync_queue"
#define MAX_SIZE    1024
#define MSG_STOP    "end"
#define MSG_READY   "ready"
#define MSG_OVER    "over"

void sender() {
    mqd_t mq, mq_sync;
    char buffer[MAX_SIZE];
    struct mq_attr attr;

    // Set the queue attributes
    attr.mq_flags = 0;
    attr.mq_maxmsg = 10;
    attr.mq_msgsize = MAX_SIZE;
    attr.mq_curmsgs = 0;

    // Open or create the message queues
    mq = mq_open(QUEUE_NAME, O_CREAT | O_WRONLY, 0644, &attr);
    mq_sync = mq_open(QUEUE_SYNC, O_CREAT | O_RDONLY, 0644, &attr);
    if (mq == (mqd_t)-1 || mq_sync == (mqd_t)-1) {
        perror("mq_open");
        exit(1);
    }

    while (1) {
        // Wait for the receiver to be ready
        if (mq_receive(mq_sync, buffer, MAX_SIZE, NULL) == -1) {
            perror("mq_receive");
            break;
        }

        printf("Sender::Input a message ('exit' to end): ");
        fflush(stdout);
        memset(buffer, 0, sizeof(buffer));
        fgets(buffer, MAX_SIZE, stdin);

        // Remove newline character, if present
        size_t len = strlen(buffer);
        if (len > 0 && buffer[len - 1] == '\n') {
            buffer[--len] = '\0';
        }

        // Check if the user wants to exit
        if (strncmp(buffer, "exit", strlen("exit")) == 0) {
            strcpy(buffer, MSG_STOP); // Set buffer to "end"
            len = strlen(MSG_STOP);
        }

        // Send the message
        if (mq_send(mq, buffer, len + 1, 0) == -1) {
            perror("mq_send");
            break;
        }

        // If we sent "end", wait for "over" and then exit
        if (strncmp(buffer, MSG_STOP, strlen(MSG_STOP)) == 0) {
            if (mq_receive(mq_sync, buffer, MAX_SIZE, NULL) == -1) {
                perror("mq_receive");
                break;
            }
            if (strncmp(buffer, MSG_OVER, strlen(MSG_OVER)) == 0) {
                printf("Sender::Received response: %s\n", buffer);
                break;
            }
        }
    }

    // Cleanup
    mq_close(mq);
    mq_unlink(QUEUE_NAME);
    mq_close(mq_sync);
    mq_unlink(QUEUE_SYNC);
}

void receiver() {
    mqd_t mq, mq_sync;
    char buffer[MAX_SIZE];
    struct mq_attr attr;

    // Set the queue attributes
    attr.mq_flags = 0;
    attr.mq_maxmsg = 10;
    attr.mq_msgsize = MAX_SIZE;
    attr.mq_curmsgs = 0;

    // Open the message queues
    mq = mq_open(QUEUE_NAME, O_CREAT | O_RDONLY, 0644, &attr);
    mq_sync = mq_open(QUEUE_SYNC, O_CREAT | O_WRONLY, 0644, &attr);
    if (mq == (mqd_t)-1 || mq_sync == (mqd_t)-1) {
        perror("mq_open");
        exit(1);
    }

    // Send ready message to sender
    if (mq_send(mq_sync, MSG_READY, strlen(MSG_READY) + 1, 0) == -1) {
        perror("mq_send");
        mq_close(mq);
        mq_unlink(QUEUE_NAME);
        mq_close(mq_sync);
        mq_unlink(QUEUE_SYNC);
        exit(1);
    }

    while (1) {
        // Receive the message
        ssize_t bytes_read = mq_receive(mq, buffer, MAX_SIZE, NULL);
        if (bytes_read == -1) {
            perror("mq_receive");
            break;
        }
        buffer[bytes_read] = '\0';

        // Check for the "end" message
        if (strncmp(buffer, MSG_STOP, strlen(MSG_STOP)) == 0) {
            // Send the "over" message to the sender
            if (mq_send(mq_sync, MSG_OVER, strlen(MSG_OVER) + 1, 0) == -1) {
                perror("mq_send");
                break;
            }
            printf("Receiver::Received: %s, sending 'over' and exiting.\n", buffer);
            break;
        } else {
            printf("Receiver::Received: %s\n", buffer);
            // Indicate ready for the next message
            if (mq_send(mq_sync, MSG_READY, strlen(MSG_READY) + 1, 0) == -1) {
                perror("mq_send");
                break;
            }
        }
    }

    // Cleanup
    mq_close(mq);
    mq_close(mq_sync);
}

int main() {
    pid_t pid = fork();

    if (pid == 0) {
        // Child process - receiver
        receiver();
    } else if (pid > 0) {
        // Parent process - sender
        sender();
        wait(NULL); // Wait for child process to finish
    } else {
        perror("fork");
        return 1;
    }

    return 0;
}

```
::