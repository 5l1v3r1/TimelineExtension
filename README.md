# Timeline Support - Web Extension

A web extension that integrates Windows Timeline support into popular browsers.

![Timeline Image](extension/images/store/timeline.png)

## Introduction

Timeline Support is a web extension that integrates Windows Timeline support into popular browsers. This is done by publishing your browsing history as activities to the Microsoft Graph (so a Microsoft Account is required to use this extension). Personal Microsoft Accounts are confirmed to work, work and school accounts should work.

A list of known issues and planned features is located below. Before opening a new issue, check that it's not mentioned below and does not already exist.

See frequently asked questions [here](FAQ.md).

## Browser Support

|Browser|Supported|Download|Note|
|--|--|--|--|
|Google Chrome|Yes|[Chrome Web Store](https://chrome.google.com/webstore/detail/windows-timeline-support/meokcjmjkobffcgldbjjklmaaediikdj)|Fully Supported|
|Firefox|Yes|[Firefox Addons](https://addons.mozilla.org/en-GB/firefox/addon/windows-timeline-support/)|Fully Supported|
|Microsoft Edge|No|n/a|Microsoft Edge already has Windows Timeline integration. Might release a version that only contains Project Rome support.|
|Vivaldi|Yes|[Chrome Web Store](https://chrome.google.com/webstore/detail/windows-timeline-support/meokcjmjkobffcgldbjjklmaaediikdj)|Supported Icon Assets. Chrome OAuth Base.|
|Opera|Yes|[Chrome Web Store](https://chrome.google.com/webstore/detail/windows-timeline-support/meokcjmjkobffcgldbjjklmaaediikdj)| Supported Icon Assets. Download from Chrome Web Store on supported Opera versions.|
|Safari|No| n/a | No support is planned. The costs and effort to port the extension (and then deal with Apple Support) is not worth it.|

## Setup

1. Clone the repository and open it.
2. Run `npm install`.
3. Run `npm run build` to build files or `npm run watch` for debugging.
4. Open browser, load unpacked extension in the `extension` folder.

## Version History

### 1.0.4

* New UI design.
* Added about page.
* Renamed extension to "Timeline Support" due to take-down request.
* Updated packages.

### 1.0.3

* Fixed issue that broke login for Opera users.
* Added new authentication system for generic browsers (Opera, Firefox Mobile) so they can login.

### 1.0.2

* Fixed scaling issue for Firefox Mobile.
* Fix issue where websites would be stored in your feed while in private mode.
* Added recent activities button.
* Added Opera icon assets.
* Fixed an issue where timeline activities would not appear or take a while to appear.

### 1.0.1

* Initial public beta.

## More Screenshots

![Signed In](extension/images/store/signed-in.png)

![Signed Out](extension/images/store/signed-out.png)

## Authors

- **Dominic Maas** - *Initial Work and Lead* - [Twitter](https://twitter.com/dominicjmaas)
- **Daniel Aleksandersen** - *Firefox Port, Icon and Other Misc Changes* - [Homepage](https://www.daniel.priv.no/)

See also the list of [contributors](https://github.com/DominicMaas/TimelineExtension/graphs/contributors) who participated in this project.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details