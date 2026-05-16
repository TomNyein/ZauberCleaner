---
title: Where the space goes
date: 2026-05-16
category: BUILDING
---

Every few months I run out of disk space on my MacBook Pro with 250GB. This despite having enabled iCloud Photos and iCloud Drive, Optimize Mac Storage option. My cleaning routine was always the same. Open Storage Settings, delete old downloads, empty the trash, maybe move a few videos to an external drive. That buys me a week or two. Then it's back.

I'd built a basic cleaner before, in SwiftUI. It did the standard thing: scan Library/Caches, show the Trash, let you browse large files. It worked fine. But every time I used it, the disk would fill up again within days. I was cleaning the wrong folders.

After a chat with Claude, I opened a terminal and ran `du -sh` across my home directory. Not Downloads. Not Documents. The directories that developer tools create quietly and I never think of them again.

The numbers were bad. 6 GB of Turborepo cache in a single project. 15 GB of CocoaPods downloads sitting in Library/Caches. 10 GB in the pnpm store, most of it packages no project was referencing anymore. DerivedData from Xcode builds I'd long forgotten. CoreSimulator runtimes for iOS versions I'd already uninstalled. `.next` build outputs in every Next.js project I'd touched in the past year. Gradle caches from a React Native app I shipped in Q1.

I added it up. Over 90 GB on a 460 GB disk with 18 GB free. That's not a cleanup task. That's a different category of problem.

A general-purpose disk cleaner doesn't know about these paths. It'll find your Downloads folder and your Trash. It won't find `~/Library/Developer/CoreSimulator` or `.turbo/cache` nested three levels deep in a monorepo. You only know those exist if you've been the one running shell commands at 11pm wondering why Xcode won't build.

So I scrapped the SwiftUI version and rebuilt from scratch. Electron, React, TypeScript. Not because I have strong feelings about Electron. But the app is really a list of shell commands with a UI on top. It runs `find`, `du`, `xcrun simctl`, `pnpm store prune`. The same things you'd type in a terminal, except it shows you what it found before touching anything and lets you pick which folders to keep.

The design follows the same aesthetic as this website. Warm cream, system fonts, generous whitespace, no colour until something needs your attention. I didn't plan that. But once the first screen rendered with a white card on a beige background, anything else felt wrong. If this site says something about how I think about the things I make, the tools I make should say the same thing.

Each cleanup row has a safety label. Green means the folder regenerates on the next build or install. Amber means stop and read before you click. Clicking the delete button doesn't delete anything. It opens a detail view listing every individual folder with its size and last modified date. You choose what goes. Nothing runs until you say so.

Fourteen categories across six groups. Build caches, package manager stores, Xcode artifacts, Docker images, app updater leftovers, Trash. The scan takes about thirty seconds. On my machine it consistently finds 80 to 100 GB that can be safely removed.

The name is Zauber. It means magic in German. Say it out loud and it sounds like Sauber, which means clean. I liked that. A little Zauber to keep your Mac Sauber.

It's open source and the DMG is on GitHub. [github.com/TomNyein/ZauberCleaner](https://github.com/TomNyein/ZauberCleaner)
