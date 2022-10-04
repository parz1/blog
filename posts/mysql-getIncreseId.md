MYSQL获取自增ID的四种方法

 

\1. select max(id) from tablename 

 

2.SELECT LAST_INSERT_ID() 函数 

 

LAST_INSERT_ID 是与table无关的，如果向表a插入数据后，再向表b插入数据，LAST_INSERT_ID会改变。 

 

在多用户交替插入数据的情况下max(id)显然不能用。这时就该使用LAST_INSERT_ID了，因为LAST_INSERT_ID是基 于Connection的，只要每个线程都使用独立的 Connection对象，LAST_INSERT_ID函数将返回该Connection对AUTO_INCREMENT列最新的insert or update 操作生成的第一个record的ID。这个值不能被其它客户端（Connection）影响，保证了你能够找回自己的 ID 而不用担心其它客户端的活动，而且不需要加锁。使用单INSERT语句插入多条记录, LAST_INSERT_ID返回一个列表。 

 

\3. select @@IDENTITY; 

 

@@identity 是表示的是最近一次向具有identity属性(即自增列)的表插入数据时对应的自增列的值，是[系统](http://www.2cto.com/os/)定义的全局变量。一般系统定义的全局变量都是以@@开头，用户自定义变量以@开头。 

 

比如有个表A，它的自增列是id，当向A表插入一行数据后，如果插入数据后自增列的值自动增加至101，则通过select @@identity得到的值就是101。使用@@identity的前提是在进行insert操作后，执行select @@identity的时候连接没有关闭，否则得到的将是NULL值。 

 

\4. SHOW TABLE STATUS; 

 

得出的结果里边对应表名记录中有个Auto_increment字段，里边有下一个自增ID的数值就是当前该表的最大自增ID.



\5. 一开始想在插入项目之后，用SELECT LAST_INSERT_ID() 获取生成的ID，后来发现，在插入操作完成后的返回结果里就带有自动生成的ID。可用rows.insertId获取