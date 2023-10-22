![Flatex Downloader (Community Edition) Header](https://github.com/purecopy/flatex-download-chrome-extension/blob/main/raw/repo-header.png)

# Flatex Downloader (Community Edition)

> Simple Batch Downloader for your Flatex Documents.
> Download all your Documents in one go.

## Table of Contents

- [Intro](#intro)
- [Installation](#installation)
  - [Chrome Webstore](#chrome-webstore)
  - [Manual](#manual)
- [Usage](#usage)
- [Build](#build-from-source)
- [Privacy](#privacy)
- [Todo](#todo)

## Intro

We all love Flatex, but it is missing a crucial key feature: Batch downloading your Flatex Mailings.

## Installation

### Chrome Webstore

Download [here](https://chrome.google.com/webstore/detail/flatex-downloader-communi/caodakaebfjohdpppfginjfeiopakjek)

### Manual

1. Download & unpack [extension.zip](https://github.com/purecopy/flatex-download-chrome-extension/releases/download/v1.0.2/extension.zip) from the latest release file.

2. Install extension
   ```
   Manage Extensions --> Activate "Developer Mode" --> Click "Load unpacked" --> select "build" folder
   ```

## Usage

1. Go to the Document Archive
2. Select preferred filters
3. Click "Download" in the Extension

## Build from source

1. Clone the repo

   ```bash
   git@github.com:purecopy/flatex-download-chrome-extension.git
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Build the extension

   ```bash
   npm run build
   ```

4. Add the extension to Chrome

## Privacy

Because it adds functionality to the normal browser context, Flatex Downloader requires the permission to read and write to the webpage.

## Todo

- [x] Flatex DE Support
