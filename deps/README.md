# web-pio / deps

## `excluded.txt`

This file lists the directories that should not be copied from chirimen-drivers.

## `/drivers`

The files in the `/drivers` directory are checked weekly for updates to the [chirimen-drivers repository](https://github.com/chirimen-oh/chirimen-drivers), and any updates are automatically copied.

## `/tmp`

These are files not sourced through chirimen-drivers, or drivers that have been modified independently.

Since the I2C device drivers used by web-pio depend on chirimen-drivers, this directory also includes candidates for future pull requests to chirimen-drivers. In that case, these files will be removed from this directory after being merged into chirimen-drivers.

