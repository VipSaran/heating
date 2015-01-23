Dependencies
============

Node.js
-------

[Node.js](nodejs.org) is a platform built on Chrome's JavaScript runtime for easily building fast, scalable network applications. Node.js uses an event-driven, non-blocking I/O model that makes it lightweight and efficient, perfect for data-intensive real-time applications that run across distributed devices.

Installation variant 1)

    wget http://node-arm.herokuapp.com/node_latest_armhf.deb # v0.10.35 as of January 2015
    sudo dpkg -i node_latest_armhf.deb

Installation variant 2)

Described [here](http://joshondesign.com/2013/10/23/noderpi). Latest stable (0.10.x) Raspberry Pi binaries (as of January 2015) are [these](http://nodejs.org/dist/v0.10.28/node-v0.10.28-linux-arm-pi.tar.gz) and experimental (0.11.x) are [these](http://nodejs.org/dist/v0.11.12/node-v0.11.12-linux-arm-pi.tar.gz).


Node.js modules
---------------

The application uses some 3rd party modules dependency on which is listed in `package.json` and resolved with following command:

    npm install


1-Wire & OWFS
-------------

OWFS is an easy way to use the powerful 1-wire system of Dallas/Maxim. [OWFS](http://owfs.org/) is a simple and flexible program to monitor and control the physical environment. You can write scripts to read temperature, flash lights, write to an LCD, log and graph...

Go through [a tutorial](http://www.cl.cam.ac.uk/projects/raspberrypi/tutorials/temperature/) for measuring temperature with DS18B20 temperature sensor.


RRDtool
-------

The Round Robin Database Tool ([RRDtool](http://oss.oetiker.ch/rrdtool/index.en.html)) is a system to store and display time-series data (e.g. network bandwidth, machine-room temperature, server load average). It stores the data in Round Robin Databases (RRDs), a very compact way that will not expand over time. RRDtool processes the extracted data to enforce a certain data density, allowing for useful graphical representation of data values.

Installation:

    sudo apt-get install rrdtool


Configuration
=============

