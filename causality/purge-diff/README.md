# purge-diff

This is a small python script which runs `native-image` twice:
1. Without any further options
2. With all methods specified on stdin removed
and compares the set of resulting methods.

It is useful in order to validate predictions made by `causality-query`.

## Usage

- Execute `make run_net_example` in order to see which methods would fall out of the image if `java.net.URL.getHostAddress()` was removed.
- Execute `make run_virtual_example` in order to see how changing flows removes virtual methods from the universe.

(both will let you wait for ~1minute)