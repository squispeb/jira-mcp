#!/usr/bin/env node

// This file is a simple wrapper to start the application in CLI mode
process.env.NODE_ENV = "cli";
require("./index");
