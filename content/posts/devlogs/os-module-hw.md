---
title: OS 模块编程实验题解
description: HDU 潘万彬老师的操作系统课程后作业
published: 2024/04/11
---

设计一个模块，要求列出系统中所有内核线程的程序名、PID、进程状态、进程优先级、父进程的PID。

```c
#include <linux/kernel.h>
#include <linux/module.h>
#include <linux/sched.h>
#include <linux/sched/task.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("ivor");
MODULE_DESCRIPTION("A module to list kernel threads");

static int __init list_kthreads_init(void) {
    struct task_struct *task;

    printk(KERN_INFO "Loading ListKThreads Module...\n");
    for_each_process(task) {
        // Check if the task is a kernel thread
        if (task->mm == NULL) {
            char state = task_state_to_char(task); // Get the task state as a character
            printk(KERN_INFO "Kernel Thread - Name: %s, PID: %d, State: %c, Priority: %d, Parent PID: %d\n",
                   task->comm, task->pid, state, task->prio, task->parent->pid);
        }
    }
    return 0;
}

static void __exit list_kthreads_exit(void) {
    printk(KERN_INFO "Unloading ListKThreads Module...\n");
}

module_init(list_kthreads_init);
module_exit(list_kthreads_exit);

```

[![dmesg 截图](https://g.imgtg.com/uploads/7247/661ca0e27ca32.png)](https://g.imgtg.com/uploads/7247/661ca0e27ca32.png)

设计一个带参数的模块，其参数为某个进程的PID号，模块的功能是列出该进程的家族信息，包括父进程、兄弟进程和子进程的程序名、PID号、进程状态。

```c
#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/sched.h>
#include <linux/init.h>
#include <linux/pid.h>
#include <linux/sched/signal.h>

static int pid = 1; // 默认PID为1（init进程）
module_param(pid, int, 0644);
MODULE_PARM_DESC(pid, "The process ID to find the family of.");

static int __init pid_family_init(void)
{
    struct pid *pid_struct;
    struct task_struct *task;
    struct task_struct *parent;
    struct list_head *list;

    printk(KERN_INFO "Loading PID Family module for PID: %d.\n", pid);

    // 获取PID对应的task_struct
    pid_struct = find_get_pid(pid);
    task = pid_task(pid_struct, PIDTYPE_PID);
    if (!task)
    {
        printk(KERN_INFO "PID %d not found.\n", pid);
        return -ESRCH;
    }

    parent = task->real_parent;
    printk(KERN_INFO "Parent process: %s [PID: %d, State: %c]\n",
           parent->comm, parent->pid, task_state_to_char(parent));

    // 兄弟进程
    list_for_each(list, &parent->children)
    {
        struct task_struct *sibling;
        sibling = list_entry(list, struct task_struct, sibling);
        printk(KERN_INFO "Sibling process: %s [PID: %d, State: %c]\n",
               sibling->comm, sibling->pid, task_state_to_char(sibling));
    }

    // 子进程
    list_for_each(list, &task->children)
    {
        struct task_struct *child;
        child = list_entry(list, struct task_struct, sibling);
        printk(KERN_INFO "Child process: %s [PID: %d, State: %c]\n",
               child->comm, child->pid, task_state_to_char(child));
    }

    return 0;
}

static void __exit pid_family_exit(void)
{
    printk(KERN_INFO "Unloading PID Family module.\n");
}

MODULE_LICENSE("GPL");
MODULE_AUTHOR("ivor");
MODULE_DESCRIPTION("A module to list process family by PID");
MODULE_VERSION("0.1");

module_init(pid_family_init);
module_exit(pid_family_exit);

```

[![PID Family](https://g.imgtg.com/uploads/7247/661ca0e281d0d.png)](https://g.imgtg.com/uploads/7247/661ca0e281d0d.png)

```
sudo insmod pid_family.ko my_parameter=1
```

追踪结果如下
[![pid_family](https://g.imgtg.com/uploads/7247/661ca17592618.png)](https://g.imgtg.com/uploads/7247/661ca17592618.png)

题目二：
设计一个带参数的模块，其参数为源文件和目标文件的文件名（可能带路径），模块功能是实现文件拷贝功能。

```c
#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/fs.h>
#include <linux/uaccess.h>
#include <linux/slab.h>
#include <linux/file.h>
#include <linux/mm.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("ivor");
MODULE_DESCRIPTION("Simple file copying kernel module.");

static char *source = "";
static char *target = "";

module_param(source, charp, 0);
MODULE_PARM_DESC(source, "The source file path.");
module_param(target, charp, 0);
MODULE_PARM_DESC(target, "The target file path.");

static int __init filecopy_init(void) {
    struct file *src_filp = NULL;
    struct file *dst_filp = NULL;
    loff_t src_size = 0;
    char *buf = NULL;
    ssize_t read_bytes, write_bytes;

    printk(KERN_INFO "filecopy: Module loaded.\n");

    if (strlen(source) == 0 || strlen(target) == 0) {
        printk(KERN_ALERT "filecopy: Source and target paths must be set.\n");
        return -EINVAL;
    }

    src_filp = filp_open(source, O_RDONLY, 0);
    if (IS_ERR(src_filp)) {
        printk(KERN_ALERT "filecopy: Cannot open source file: %ld.\n", PTR_ERR(src_filp));
        return PTR_ERR(src_filp);
    }

    // Get the size of the source file
    src_size = vfs_llseek(src_filp, 0, SEEK_END);
    vfs_llseek(src_filp, 0, SEEK_SET);

    dst_filp = filp_open(target, O_WRONLY | O_CREAT, 0644);
    if (IS_ERR(dst_filp)) {
        printk(KERN_ALERT "filecopy: Cannot open target file: %ld.\n", PTR_ERR(dst_filp));
        filp_close(src_filp, NULL);
        return PTR_ERR(dst_filp);
    }

    buf = kmalloc(src_size, GFP_KERNEL);
    if (!buf) {
        printk(KERN_ALERT "filecopy: Unable to allocate memory.\n");
        filp_close(src_filp, NULL);
        filp_close(dst_filp, NULL);
        return -ENOMEM;
    }

    // Read data from source file
    read_bytes = kernel_read(src_filp, buf, src_size, &src_filp->f_pos);
    if (read_bytes < 0) {
        printk(KERN_ALERT "filecopy: Failed to read from source file.\n");
        kfree(buf);
        filp_close(src_filp, NULL);
        filp_close(dst_filp, NULL);
        return read_bytes;
    }

    // Write data to target file
    write_bytes = kernel_write(dst_filp, buf, read_bytes, &dst_filp->f_pos);
    if (write_bytes != read_bytes) {
        printk(KERN_ALERT "filecopy: Failed to write to target file.\n");
    } else {
        printk(KERN_INFO "filecopy: File copied successfully.\n");
    }

    kfree(buf);
    filp_close(src_filp, NULL);
    filp_close(dst_filp, NULL);

    return 0;
}

static void __exit filecopy_exit(void) {
    printk(KERN_INFO "filecopy: Module unloaded.\n");
}

module_init(filecopy_init);
module_exit(filecopy_exit);

```

[![filecopy_module.png](https://g.imgtg.com/uploads/7247/661ca0e28fe48.png)](https://g.imgtg.com/uploads/7247/661ca0e28fe48.png)

设计一个带参数的模块，其参数为指定进程标识符PID，模块功能是输出该进程所对应的资源使用情况，包括用户态和内核态的执行时间（以秒和微秒为单位）、无需和需要物理输入输出操作的页面错误次数、进程置换出内存的次数。（参考getrusage和sys_getrusage）

[![filecopy](https://g.imgtg.com/uploads/7247/661ca17597b83.png)](https://g.imgtg.com/uploads/7247/661ca17597b83.png)

设计一个带参数的模块，其参数为指定进程标识符PID，模块功能是输出该进程所对应的资源使用情况，包括用户态和内核态的执行时间（以秒和微秒为单位）、无需和需要物理输入输出操作的页面错误次数、进程置换出内存的次数。（参考getrusage和sys_getrusage）

```c
#include <linux/module.h>
#include <linux/sched.h>
#include <linux/sched/task.h>
#include <linux/sched/signal.h>
#include <linux/pid.h>
#include <linux/proc_fs.h>
#include <linux/seq_file.h>
#include <linux/uaccess.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("ivor");
MODULE_DESCRIPTION("Module that reports resource usage of a process by PID.");

static int pid = -1;
module_param(pid, int, 0644);
MODULE_PARM_DESC(pid, "The process ID to report resource usage for.");

static int proc_show(struct seq_file *m, void *v) {
    struct task_struct *task;
    struct pid *pid_struct;
    struct rusage r_usage;

    pid_struct = find_get_pid(pid);
    task = pid_task(pid_struct, PIDTYPE_PID);
    if (task) {
        get_task_struct(task);

        memset(&r_usage, 0, sizeof(struct rusage));

        // User time and system time
        r_usage.ru_utime.tv_sec = task->utime / NSEC_PER_SEC;
        r_usage.ru_utime.tv_usec = (task->utime % NSEC_PER_SEC) / NSEC_PER_USEC;
        r_usage.ru_stime.tv_sec = task->stime / NSEC_PER_SEC;
        r_usage.ru_stime.tv_usec = (task->stime % NSEC_PER_SEC) / NSEC_PER_USEC;

        // Minor and major page faults
        r_usage.ru_minflt = task->min_flt;
        r_usage.ru_majflt = task->maj_flt;

        // Context switches
        r_usage.ru_nvcsw = task->nvcsw;
        r_usage.ru_nivcsw = task->nivcsw;

        // Output the collected information
        seq_printf(m, "User time: %ld.%06ld seconds\n",
                   r_usage.ru_utime.tv_sec, r_usage.ru_utime.tv_usec);
        seq_printf(m, "System time: %ld.%06ld seconds\n",
                   r_usage.ru_stime.tv_sec, r_usage.ru_stime.tv_usec);
        seq_printf(m, "Minor page faults: %ld\n", r_usage.ru_minflt);
        seq_printf(m, "Major page faults: %ld\n", r_usage.ru_majflt);
        seq_printf(m, "Voluntary context switches: %ld\n", r_usage.ru_nvcsw);
        seq_printf(m, "Involuntary context switches: %ld\n", r_usage.ru_nivcsw);

        put_task_struct(task);
    } else {
        seq_printf(m, "Process with PID %d not found.\n", pid);
    }

    put_pid(pid_struct);

    return 0;
}

static int proc_open(struct inode *inode, struct file *file) {
    return single_open(file, proc_show, NULL);
}

static const struct proc_ops proc_fops = {
    .proc_open = proc_open,
    .proc_read = seq_read,
    .proc_lseek = seq_lseek,
    .proc_release = single_release,
};

static int __init rusage_mod_init(void) {
    proc_create("proc_rusage", 0, NULL, &proc_fops);
    printk(KERN_INFO "rusage_mod: Module loaded. Monitoring PID: %d\n", pid);
    return 0;
}

static void __exit rusage_mod_exit(void) {
    remove_proc_entry("proc_rusage", NULL);
    printk(KERN_INFO "rusage_mod: Module unloaded.\n");
}

module_init(rusage_mod_init);
module_exit(rusage_mod_exit);

```

[![rusage](https://g.imgtg.com/uploads/7247/661ca1759ca1e.png)](https://g.imgtg.com/uploads/7247/661ca1759ca1e.png)

设计一个带参数的模块，其参数为指定进程标识符PID，模块功能是输出指定进程的相关时间信息，如进程创建时间、进程在用户态及内核态的运行时间、进程的所有子孙进程在用户态的运行时间及在内核态的运行时间等。

[![time](https://g.imgtg.com/uploads/7247/661ca1759a413.png)](https://g.imgtg.com/uploads/7247/661ca1759a413.png)

设计一个带参数的模块，其参数为新主机名，模块功能是改变原主机名称为参数传入的字符串（新主机名）。

```c
#include <linux/kmod.h>
#include <linux/module.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("ivor");
MODULE_DESCRIPTION("A module to change the hostname using usermodehelper");

static char *new_hostname = "new_hostname";
module_param(new_hostname, charp, 0644);
MODULE_PARM_DESC(new_hostname, "The new hostname to set");

static int __init set_hostname_init(void) {
    char *argv[] = { "/usr/bin/hostname", new_hostname, NULL };
    static char *envp[] = {
        "HOME=/",
        "TERM=linux",
        "PATH=/sbin:/bin:/usr/sbin:/usr/bin", NULL
    };

    int ret = call_usermodehelper(argv[0], argv, envp, UMH_WAIT_EXEC);
    if (ret != 0)
        pr_err("Unable to set hostname, call_usermodehelper returned: %d\n", ret);
    else
        pr_info("Hostname set to %s\n", new_hostname);

    return ret;
}

static void __exit set_hostname_exit(void) {
    pr_info("Hostname change module unloaded\n");
}

module_init(set_hostname_init);
module_exit(set_hostname_exit);

```

[![set_hostname](https://g.imgtg.com/uploads/7247/661ca1757a8bc.png)](https://g.imgtg.com/uploads/7247/661ca1757a8bc.png)



设计一个带参数的模块，其参数为指定进程标识符PID和新nice值（优先值），模块功能为修改指定进程的优先级（nice值和prio值）

```c
#include <linux/module.h>
#include <linux/sched.h>
#include <linux/sched/signal.h>
#include <linux/pid.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("ivor");
MODULE_DESCRIPTION("A module to change the nice value of a process");

static int pid;
module_param(pid, int, 0644);
MODULE_PARM_DESC(pid, "The PID of the process");

static int new_nice;
module_param(new_nice, int, 0644);
MODULE_PARM_DESC(new_nice, "The new nice value for the process");

static int __init change_nice_init(void) {
    struct pid *pid_struct;
    struct task_struct *task;
    int old_nice;

    // Find the task_struct associated with this PID
    pid_struct = find_get_pid(pid);
    if (!pid_struct) {
        pr_err("Could not find PID %d\n", pid);
        return -ESRCH;
    }

    task = pid_task(pid_struct, PIDTYPE_PID);
    if (!task) {
        pr_err("Could not find task for PID %d\n", pid);
        put_pid(pid_struct);
        return -ESRCH;
    }

    // Get the old nice value before setting the new one
    old_nice = task_nice(task);

    // Attempt to set the new nice value
    set_user_nice(task, new_nice);

    // Check the nice value after setting it
    if (task_nice(task) != new_nice) {
        pr_err("Could not set nice value for PID %d, old nice was %d\n", pid, old_nice);
        put_pid(pid_struct);
        return -EACCES;
    }

    pr_info("Set nice value of PID %d from %d to %d\n", pid, old_nice, new_nice);

    // Decrease the refcount of the pid
    put_pid(pid_struct);

    return 0;
}

static void __exit change_nice_exit(void) {
    pr_info("Nice change module exited\n");
}

module_init(change_nice_init);
module_exit(change_nice_exit);

```
