[HOME](Home) > [TECHNICAL DOCUMENTATION](technical-documentation) > [SUBSYSTEMS](subsystems) > **DISPATCH**

joola.io's heart-beat is controlled by the `dispatch` sub-system.

We want the framework to be node oriented, i.e. you'll be able to deploy additional nodes to cope with increased work loads, this will allow near-linear scalability.
The `dispatch` also helps us address a core issue with **nodejs**, event loop blocks. At any point in time, only one "process" can occupy nodejs' event loop, this can lead to several issues. The most common one is needing to wait on a request while nodejs processes a pending one.

Having `dispatch` allow us to distribute workload among several nodes, thus reducing the event loop blocks effect on user experience. In addition, we've built several clever
 features into `dispatch` to allow certain logic to even offer a better non-blocking experience.

## The Message Bus

## Request/Fulfill

## Routing Logic

