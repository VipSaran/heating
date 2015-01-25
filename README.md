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

The application uses some 3rd party modules, dependency on which is listed in `package.json` and resolved with the following command:

    npm install


1-Wire & OWFS
-------------

OWFS is an easy way to use the powerful 1-wire system of Dallas/Maxim. [OWFS](http://owfs.org/) is a simple and flexible program to monitor and control the physical environment. You can write scripts to read temperature, flash lights, write to an LCD, log and graph...

Go through [a tutorial](http://www.cl.cam.ac.uk/projects/raspberrypi/tutorials/temperature/) for setting up measuring temperature with DS18B20 temperature sensor.


RRDtool
-------

The Round Robin Database Tool ([RRDtool](http://oss.oetiker.ch/rrdtool/index.en.html)) is a system to store and display time-series data (e.g. network bandwidth, machine-room temperature, server load average). It stores the data in Round Robin Databases (RRDs), a very compact way that will not expand over time. RRDtool processes the extracted data to enforce a certain data density, allowing for useful graphical representation of data values.

Installation:

    sudo apt-get install rrdtool


Initial Configuration
=====================

**Relay pins** and temperanture **sensor 1-wire address** are set up in `/app/gpio-tools.js`:

  - `gpioPinHeater` & `gpioPinPump` variables are using *header* pin numbers. (You can refer to [this mapping](http://wiringpi.com/wp-content/uploads/2013/03/gpio1.png) to distinguish between header, BCM and wiringPi pin numbering),
  - `tempLivingSensorId` variable represents the (living room) temperanture sensor directory name on 1-wire bus.

**Outside temperature** is gathered from a 3rd party weather service ([forecast.io](https://developer.forecast.io/docs/v2)) which requires an API key that needs to be specified in `/app/weather-tools.js` variable `options.APIKey`. Frequency of accessing this API (`config.collect_record_interval`) is configured so that the number of free daily requests is not exceeded.

Application checks the origin of the (API) request and doesn't restrict access for localy originated requests, but if used remotely (i.e. from outside of LAN) then the **authentication** (username & password) is enforced for application (API) write-access. To create a user, simply run `node createUser.js username password`. Password is hashed and, for simplicity, stored as JSON in `/app/.auth` file.

Optionally, to enable online **scrobbling** of measurements (currently disabled) change the value of `scrobble_data_online` in `/app/config-tools.js` and set up a [Sen.se](http://open.sen.se/dev/) account API key to be used in variable `sense_url` in `/app/cloud-tools.js`.