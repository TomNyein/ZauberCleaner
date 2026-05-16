import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { homedir } from 'os';
import * as path from 'path';

const execAsync = promisify(exec);
const HOME = homedir();
const EXEC_OPTS = { timeout: 60_000, maxBuffer: 10 * 1024 * 1024 };

export interface CleanupItemDef {
  id: string;
  name: string;
  group: string;
  groupLabel: string;
  description: string;
  tooltip: string;
  safetyLevel: 'safe' | 'caution' | 'destructive';
  regenerateNote: string;
  deleteCommandDisplay: string;
}

export interface ScanResult {
  id: string;
  size: number;
  available: boolean;
  error?: string;
}

export interface CleanResult {
  id: string;
  bytesFreed: number;
  success: boolean;
  output?: string;
  error?: string;
}

export interface DiskInfo {
  total: number;
  free: number;
}

export const CLEANUP_ITEMS: CleanupItemDef[] = [
  // ── Dev caches ──
  {
    id: 'next-dirs',
    name: '.next directories',
    group: 'dev-caches',
    groupLabel: 'Dev caches (regenerate on next build)',
    description: 'Next.js build outputs',
    tooltip: 'Build cache created by Next.js. Regenerates on next build or dev server start.',
    safetyLevel: 'safe',
    regenerateNote: 'Regenerates on next `next build` or `next dev`.',
    deleteCommandDisplay: 'find ~/Developer -type d -name ".next" -not -path "*/node_modules/*" -exec rm -rf {} +',
  },
  {
    id: 'turbo-cache',
    name: '.turbo/cache',
    group: 'dev-caches',
    groupLabel: 'Dev caches (regenerate on next build)',
    description: 'Turborepo build cache',
    tooltip: 'Cache used by Turborepo for incremental builds. Regenerates on next turbo run.',
    safetyLevel: 'safe',
    regenerateNote: 'Regenerates on next `turbo` run.',
    deleteCommandDisplay: 'find ~/Developer -type d -name "cache" -path "*/.turbo/*" -exec rm -rf {} +',
  },
  {
    id: 'expo-dirs',
    name: '.expo directories',
    group: 'dev-caches',
    groupLabel: 'Dev caches (regenerate on next build)',
    description: 'Expo CLI caches and metadata',
    tooltip: 'Local Expo cache directories. Regenerates on next Expo command.',
    safetyLevel: 'safe',
    regenerateNote: 'Regenerates on next Expo CLI command.',
    deleteCommandDisplay: 'find ~/Developer -type d -name ".expo" -not -path "*/node_modules/*" -exec rm -rf {} +',
  },
  {
    id: 'gradle-cache',
    name: 'Gradle caches',
    group: 'dev-caches',
    groupLabel: 'Dev caches (regenerate on next build)',
    description: 'Android/Java build caches and downloaded dependencies',
    tooltip: 'Gradle wrapper distributions, build caches, and dependency cache. Regenerates on next build.',
    safetyLevel: 'safe',
    regenerateNote: 'Regenerates on next `./gradlew` build. First build will be slower.',
    deleteCommandDisplay: 'rm -rf ~/.gradle/caches ~/.gradle/wrapper/dists',
  },

  // ── Package manager stores ──
  {
    id: 'pnpm-store',
    name: 'pnpm store',
    group: 'pkg-managers',
    groupLabel: 'Package manager stores',
    description: 'Content-addressable store (prune removes only orphaned packages)',
    tooltip: 'Shows total store size. Prune only removes packages no current project references — freed amount may be much smaller than total.',
    safetyLevel: 'safe',
    regenerateNote: 'Only orphaned packages are removed. Referenced packages stay. Freed amount is usually much smaller than the total store size shown.',
    deleteCommandDisplay: 'pnpm store prune',
  },
  {
    id: 'yarn-cache',
    name: 'Yarn cache',
    group: 'pkg-managers',
    groupLabel: 'Package manager stores',
    description: 'Cached Yarn package downloads',
    tooltip: 'Yarn offline mirror and download cache. Safe to remove if you use pnpm.',
    safetyLevel: 'safe',
    regenerateNote: 'Re-downloads as needed on next `yarn install`.',
    deleteCommandDisplay: 'rm -rf ~/Library/Caches/Yarn',
  },
  {
    id: 'cocoapods-cache',
    name: 'CocoaPods cache',
    group: 'pkg-managers',
    groupLabel: 'Package manager stores',
    description: 'Cached pod specs and downloads',
    tooltip: 'CocoaPods spec repo and downloaded pod sources. Regenerates via pod install.',
    safetyLevel: 'safe',
    regenerateNote: 'Regenerates via `pod install`.',
    deleteCommandDisplay: 'rm -rf ~/Library/Caches/CocoaPods',
  },
  {
    id: 'pip-cache',
    name: 'pip cache',
    group: 'pkg-managers',
    groupLabel: 'Package manager stores',
    description: 'Cached Python package downloads',
    tooltip: 'pip download cache. Packages re-download as needed.',
    safetyLevel: 'safe',
    regenerateNote: 'Packages re-download as needed on next `pip install`.',
    deleteCommandDisplay: 'rm -rf ~/Library/Caches/pip',
  },
  {
    id: 'homebrew-cache',
    name: 'Homebrew cache',
    group: 'pkg-managers',
    groupLabel: 'Package manager stores',
    description: 'Old formula downloads and outdated versions',
    tooltip: 'Cached downloads and old package versions. Runs brew cleanup to remove outdated files.',
    safetyLevel: 'safe',
    regenerateNote: 'Re-downloads as needed. Only removes old versions and stale downloads.',
    deleteCommandDisplay: 'brew cleanup -s && rm -rf $(brew --cache)',
  },

  // ── Xcode / iOS ──
  {
    id: 'xcode-derived-data',
    name: 'DerivedData',
    group: 'xcode',
    groupLabel: 'Xcode / iOS',
    description: 'Xcode build artifacts and indexes',
    tooltip: 'Build intermediates, indexes, and logs from Xcode projects. Regenerates on next build.',
    safetyLevel: 'safe',
    regenerateNote: 'Regenerates on next Xcode build.',
    deleteCommandDisplay: 'rm -rf ~/Library/Developer/Xcode/DerivedData/*',
  },
  {
    id: 'core-simulator-unavailable',
    name: 'CoreSimulator (unavailable)',
    group: 'xcode',
    groupLabel: 'Xcode / iOS',
    description: 'Simulators tied to uninstalled iOS runtimes',
    tooltip: 'Removes only simulator devices for iOS runtimes no longer installed.',
    safetyLevel: 'safe',
    regenerateNote: 'Only removes simulators for uninstalled runtimes. Active simulators are untouched.',
    deleteCommandDisplay: 'xcrun simctl shutdown all && xcrun simctl delete unavailable',
  },

  // ── Docker ──
  {
    id: 'docker-system',
    name: 'Docker (system prune)',
    group: 'docker',
    groupLabel: 'Docker',
    description: 'Unused images, stopped containers, and build cache',
    tooltip: 'Removes all stopped containers, unused images, networks, and build cache. Running containers are untouched.',
    safetyLevel: 'destructive',
    regenerateNote: 'Images re-pull on next docker run/compose up. Stopped containers and their data are lost permanently.',
    deleteCommandDisplay: 'docker system prune -a -f',
  },

  // ── App leftovers ──
  {
    id: 'shipit-caches',
    name: 'ShipIt installer caches',
    group: 'app-leftovers',
    groupLabel: 'App leftovers',
    description: 'Squirrel/ShipIt auto-updater leftovers',
    tooltip: 'Cached update packages from Electron apps using the Squirrel updater.',
    safetyLevel: 'safe',
    regenerateNote: 'Re-created when apps check for updates.',
    deleteCommandDisplay: 'find ~/Library/Caches -maxdepth 1 -name "*.ShipIt" -exec rm -rf {} +',
  },
  {
    id: 'playwright-browsers',
    name: 'Playwright browsers',
    group: 'app-leftovers',
    groupLabel: 'App leftovers',
    description: 'Bundled Chromium, Firefox, and WebKit for Playwright tests',
    tooltip: 'Downloaded browser binaries for Playwright testing. Reinstall with npx playwright install.',
    safetyLevel: 'safe',
    regenerateNote: 'Reinstall with `npx playwright install` when needed.',
    deleteCommandDisplay: 'rm -rf ~/Library/Caches/ms-playwright',
  },

  // ── Trash ──
  {
    id: 'trash',
    name: 'Trash',
    group: 'trash',
    groupLabel: 'Trash',
    description: 'Files in macOS Trash',
    tooltip: 'Permanently deletes all files currently in your Trash. This cannot be undone.',
    safetyLevel: 'destructive',
    regenerateNote: 'Files will be permanently deleted. This cannot be undone.',
    deleteCommandDisplay: 'rm -rf ~/.Trash/*',
  },
];

function parseDuKB(output: string): number {
  let totalKB = 0;
  for (const line of output.trim().split('\n')) {
    if (!line) continue;
    const match = line.match(/^(\d+)/);
    if (match) totalKB += parseInt(match[1], 10);
  }
  return totalKB * 1024;
}

async function cmdExists(cmd: string): Promise<boolean> {
  try {
    await execAsync(`which ${cmd}`, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

export interface CleanupDetail {
  path: string;
  displayName: string;
  size: number;
  lastModified: number;
}

async function getPathDetails(findCmd: string, stripPrefix: string): Promise<CleanupDetail[]> {
  const { stdout } = await execAsync(findCmd + ' 2>/dev/null || true', EXEC_OPTS);
  const paths = stdout.trim().split('\n').filter(Boolean);
  if (paths.length === 0) return [];

  const results = await Promise.all(
    paths.map(async (p) => {
      try {
        const [sizeOut, statOut] = await Promise.all([
          execAsync(`du -sk "${p}" 2>/dev/null || echo "0"`, { timeout: 15000 }),
          execAsync(`stat -f "%m" "${p}" 2>/dev/null || echo "0"`, { timeout: 5000 }),
        ]);
        return {
          path: p,
          displayName: p.startsWith(stripPrefix)
            ? p.slice(stripPrefix.length + 1)
            : p.replace(HOME, '~'),
          size: parseDuKB(sizeOut.stdout),
          lastModified: parseInt(statOut.stdout.trim()) * 1000 || 0,
        };
      } catch {
        return null;
      }
    }),
  );
  return results.filter((r): r is CleanupDetail => r !== null);
}

async function listContents(dir: string): Promise<CleanupDetail[]> {
  if (!existsSync(dir)) return [];

  const { stdout } = await execAsync(`ls -1A "${dir}" 2>/dev/null || true`, EXEC_OPTS);
  const names = stdout.trim().split('\n').filter(Boolean);
  if (names.length === 0) return [];

  const results = await Promise.all(
    names.map(async (name) => {
      const p = path.join(dir, name);
      try {
        const [sizeOut, statOut] = await Promise.all([
          execAsync(`du -sk "${p}" 2>/dev/null || echo "0"`, { timeout: 15000 }),
          execAsync(`stat -f "%m" "${p}" 2>/dev/null || echo "0"`, { timeout: 5000 }),
        ]);
        return {
          path: p,
          displayName: name,
          size: parseDuKB(sizeOut.stdout),
          lastModified: parseInt(statOut.stdout.trim()) * 1000 || 0,
        };
      } catch {
        return null;
      }
    }),
  );
  return results.filter((r): r is CleanupDetail => r !== null);
}

export async function scanItemDetails(id: string): Promise<CleanupDetail[]> {
  const devDir = path.join(HOME, 'Developer');

  try {
    switch (id) {
      case 'next-dirs':
        return getPathDetails(
          `find "${devDir}" -type d -name ".next" -not -path "*/node_modules/*"`,
          devDir,
        );
      case 'turbo-cache':
        return getPathDetails(
          `find "${devDir}" -type d -name "cache" -path "*/.turbo/*"`,
          devDir,
        );
      case 'expo-dirs':
        return getPathDetails(
          `find "${devDir}" -type d -name ".expo" -not -path "*/node_modules/*"`,
          devDir,
        );
      case 'gradle-cache': {
        const all: CleanupDetail[] = [];
        for (const sub of ['caches', 'wrapper/dists']) {
          const p = path.join(HOME, '.gradle', sub);
          if (existsSync(p)) all.push(...(await listContents(p)));
        }
        return all;
      }
      case 'xcode-derived-data':
        return listContents(
          path.join(HOME, 'Library', 'Developer', 'Xcode', 'DerivedData'),
        );
      case 'cocoapods-cache':
        return listContents(path.join(HOME, 'Library', 'Caches', 'CocoaPods'));
      case 'yarn-cache':
        return listContents(path.join(HOME, 'Library', 'Caches', 'Yarn'));
      case 'pip-cache':
        return listContents(path.join(HOME, 'Library', 'Caches', 'pip'));
      case 'shipit-caches':
        return getPathDetails(
          `find "${path.join(HOME, 'Library', 'Caches')}" -maxdepth 1 -name "*.ShipIt"`,
          path.join(HOME, 'Library', 'Caches'),
        );
      case 'playwright-browsers':
        return listContents(path.join(HOME, 'Library', 'Caches', 'ms-playwright'));
      case 'trash': {
        try {
          const { stdout } = await execAsync(
            `osascript -l JavaScript -e '
              var f = Application("Finder");
              var items = f.trash.items();
              var result = [];
              for (var i = 0; i < items.length; i++) {
                try {
                  result.push(items[i].name() + "\\t" + (items[i].size() || 0) + "\\t" + (items[i].modificationDate().getTime()));
                } catch(e) {}
              }
              result.join("\\n");
            '`,
            EXEC_OPTS,
          );
          return stdout.trim().split('\n').filter(Boolean).map((line) => {
            const [name, size, mod] = line.split('\t');
            return {
              path: path.join(HOME, '.Trash', name),
              displayName: name,
              size: parseInt(size) || 0,
              lastModified: parseInt(mod) || 0,
            };
          });
        } catch {
          return [];
        }
      }

      case 'pnpm-store':
        return listContents(path.join(HOME, 'Library', 'pnpm'));

      case 'homebrew-cache': {
        if (!(await cmdExists('brew'))) return [];
        try {
          const { stdout: cachePath } = await execAsync('brew --cache 2>/dev/null', { timeout: 10000 });
          const trimmed = cachePath.trim();
          if (!trimmed) return [];
          return listContents(trimmed);
        } catch {
          return [];
        }
      }

      case 'core-simulator-unavailable':
        return listContents(
          path.join(HOME, 'Library', 'Developer', 'CoreSimulator', 'Devices'),
        );

      case 'docker-system': {
        if (!(await cmdExists('docker'))) return [];
        try {
          await execAsync('docker info 2>/dev/null', { timeout: 5000 });
          const { stdout } = await execAsync(
            `docker system df --format '{{.Type}}\t{{.Size}}\t{{.Reclaimable}}' 2>/dev/null`,
            { timeout: 10000 },
          );
          return stdout.trim().split('\n').filter(Boolean).map((line) => {
            const [type, size, reclaimable] = line.split('\t');
            return {
              path: type,
              displayName: `${type} (${reclaimable} reclaimable)`,
              size: parseHumanSize(size),
              lastModified: 0,
            };
          });
        } catch {
          return [];
        }
      }

      default:
        return [];
    }
  } catch {
    return [];
  }
}

export async function cleanSelectedPaths(paths: string[]): Promise<CleanResult> {
  const allowedPrefixes = [
    path.join(HOME, 'Developer'),
    path.join(HOME, 'Library', 'Caches'),
    path.join(HOME, 'Library', 'pnpm'),
    path.join(HOME, 'Library', 'Developer'),
    path.join(HOME, '.gradle'),
    path.join(HOME, '.Trash'),
  ];

  let totalFreed = 0;
  for (const p of paths) {
    if (!allowedPrefixes.some((prefix) => p.startsWith(prefix))) continue;
    try {
      const { stdout } = await execAsync(
        `du -sk "${p}" 2>/dev/null || echo "0"`,
        { timeout: 10000 },
      );
      const size = parseDuKB(stdout);
      await execAsync(`rm -rf "${p}"`, EXEC_OPTS);
      totalFreed += size;
    } catch {
      /* skip failures */
    }
  }
  return { id: 'selected', bytesFreed: totalFreed, success: true };
}

export async function getDiskInfo(): Promise<DiskInfo> {
  try {
    const { stdout } = await execAsync(`df -k "${HOME}" | tail -1`, EXEC_OPTS);
    const parts = stdout.trim().split(/\s+/);
    return {
      total: parseInt(parts[1], 10) * 1024,
      free: parseInt(parts[3], 10) * 1024,
    };
  } catch {
    return { total: 0, free: 0 };
  }
}

export async function scanItem(id: string): Promise<ScanResult> {
  try {
    const devDir = path.join(HOME, 'Developer');

    switch (id) {
      case 'next-dirs': {
        if (!existsSync(devDir)) return { id, size: 0, available: true };
        const { stdout } = await execAsync(
          `find "${devDir}" -type d -name ".next" -not -path "*/node_modules/*" -exec du -sk {} + 2>/dev/null || true`,
          EXEC_OPTS,
        );
        return { id, size: parseDuKB(stdout), available: true };
      }

      case 'turbo-cache': {
        if (!existsSync(devDir)) return { id, size: 0, available: true };
        const { stdout } = await execAsync(
          `find "${devDir}" -type d -name "cache" -path "*/.turbo/*" -exec du -sk {} + 2>/dev/null || true`,
          EXEC_OPTS,
        );
        return { id, size: parseDuKB(stdout), available: true };
      }

      case 'pnpm-store': {
        if (!(await cmdExists('pnpm')))
          return { id, size: 0, available: false, error: 'pnpm not installed' };
        const pnpmDir = path.join(HOME, 'Library', 'pnpm');
        if (!existsSync(pnpmDir)) return { id, size: 0, available: true };
        const { stdout } = await execAsync(
          `du -sk "${pnpmDir}" 2>/dev/null || echo "0"`,
          EXEC_OPTS,
        );
        return { id, size: parseDuKB(stdout), available: true };
      }

      case 'cocoapods-cache': {
        const podsDir = path.join(HOME, 'Library', 'Caches', 'CocoaPods');
        if (!existsSync(podsDir)) return { id, size: 0, available: true };
        const { stdout } = await execAsync(
          `du -sk "${podsDir}" 2>/dev/null || echo "0"`,
          EXEC_OPTS,
        );
        return { id, size: parseDuKB(stdout), available: true };
      }

      case 'xcode-derived-data': {
        const ddDir = path.join(HOME, 'Library', 'Developer', 'Xcode', 'DerivedData');
        if (!existsSync(ddDir)) return { id, size: 0, available: false };
        const { stdout } = await execAsync(
          `du -sk "${ddDir}" 2>/dev/null || echo "0"`,
          EXEC_OPTS,
        );
        return { id, size: parseDuKB(stdout), available: true };
      }

      case 'core-simulator-unavailable': {
        if (!(await cmdExists('xcrun')))
          return { id, size: 0, available: false, error: 'Xcode CLI tools not installed' };
        const simDir = path.join(HOME, 'Library', 'Developer', 'CoreSimulator');
        if (!existsSync(simDir)) return { id, size: 0, available: false };
        const { stdout } = await execAsync(
          `du -sk "${simDir}" 2>/dev/null || echo "0"`,
          EXEC_OPTS,
        );
        return { id, size: parseDuKB(stdout), available: true };
      }

      case 'expo-dirs': {
        if (!existsSync(devDir)) return { id, size: 0, available: true };
        const { stdout } = await execAsync(
          `find "${devDir}" -type d -name ".expo" -not -path "*/node_modules/*" -exec du -sk {} + 2>/dev/null || true`,
          EXEC_OPTS,
        );
        return { id, size: parseDuKB(stdout), available: true };
      }

      case 'gradle-cache': {
        const gradleDir = path.join(HOME, '.gradle');
        if (!existsSync(gradleDir)) return { id, size: 0, available: false };
        let total = 0;
        for (const sub of ['caches', 'wrapper/dists']) {
          const p = path.join(gradleDir, sub);
          if (!existsSync(p)) continue;
          const { stdout } = await execAsync(`du -sk "${p}" 2>/dev/null || echo "0"`, EXEC_OPTS);
          total += parseDuKB(stdout);
        }
        return { id, size: total, available: true };
      }

      case 'yarn-cache': {
        const yarnDir = path.join(HOME, 'Library', 'Caches', 'Yarn');
        if (!existsSync(yarnDir)) return { id, size: 0, available: true };
        const { stdout } = await execAsync(`du -sk "${yarnDir}" 2>/dev/null || echo "0"`, EXEC_OPTS);
        return { id, size: parseDuKB(stdout), available: true };
      }

      case 'pip-cache': {
        const pipDir = path.join(HOME, 'Library', 'Caches', 'pip');
        if (!existsSync(pipDir)) return { id, size: 0, available: true };
        const { stdout } = await execAsync(`du -sk "${pipDir}" 2>/dev/null || echo "0"`, EXEC_OPTS);
        return { id, size: parseDuKB(stdout), available: true };
      }

      case 'homebrew-cache': {
        if (!(await cmdExists('brew')))
          return { id, size: 0, available: false, error: 'Homebrew not installed' };
        try {
          const { stdout: cachePath } = await execAsync('brew --cache 2>/dev/null', { timeout: 10000 });
          const trimmed = cachePath.trim();
          if (!trimmed || !existsSync(trimmed)) return { id, size: 0, available: true };
          const { stdout } = await execAsync(`du -sk "${trimmed}" 2>/dev/null || echo "0"`, EXEC_OPTS);
          return { id, size: parseDuKB(stdout), available: true };
        } catch {
          return { id, size: 0, available: true };
        }
      }

      case 'docker-system': {
        if (!(await cmdExists('docker')))
          return { id, size: 0, available: false, error: 'Docker not installed' };
        try {
          await execAsync('docker info 2>/dev/null', { timeout: 5000 });
          const { stdout } = await execAsync(
            'docker system df --format "{{.Size}}" 2>/dev/null',
            { timeout: 10000 },
          );
          let total = 0;
          for (const line of stdout.trim().split('\n')) {
            total += parseHumanSize(line.trim());
          }
          return { id, size: total, available: true };
        } catch {
          return { id, size: 0, available: false, error: 'Docker not running' };
        }
      }

      case 'shipit-caches': {
        const cachesDir = path.join(HOME, 'Library', 'Caches');
        const { stdout } = await execAsync(
          `find "${cachesDir}" -maxdepth 1 -name "*.ShipIt" -exec du -sk {} + 2>/dev/null || true`,
          EXEC_OPTS,
        );
        return { id, size: parseDuKB(stdout), available: true };
      }

      case 'playwright-browsers': {
        const pwDir = path.join(HOME, 'Library', 'Caches', 'ms-playwright');
        if (!existsSync(pwDir)) return { id, size: 0, available: true };
        const { stdout } = await execAsync(`du -sk "${pwDir}" 2>/dev/null || echo "0"`, EXEC_OPTS);
        return { id, size: parseDuKB(stdout), available: true };
      }

      case 'trash': {
        try {
          const { stdout } = await execAsync(
            `osascript -l JavaScript -e '
              var f = Application("Finder");
              var items = f.trash.items();
              var total = 0;
              for (var i = 0; i < items.length; i++) {
                try { total += items[i].size(); } catch(e) {}
              }
              total;
            '`,
            EXEC_OPTS,
          );
          return { id, size: parseInt(stdout.trim()) || 0, available: true };
        } catch {
          return { id, size: 0, available: true };
        }
      }

      default:
        return { id, size: 0, available: false, error: 'Unknown cleanup item' };
    }
  } catch (error: any) {
    return { id, size: 0, available: false, error: error.message || String(error) };
  }
}

function parseHumanSize(str: string): number {
  const match = str.match(/([\d.]+)\s*(B|kB|KB|MB|GB|TB)/i);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  switch (match[2].toUpperCase()) {
    case 'B': return Math.round(num);
    case 'KB': return Math.round(num * 1024);
    case 'MB': return Math.round(num * 1024 * 1024);
    case 'GB': return Math.round(num * 1024 * 1024 * 1024);
    case 'TB': return Math.round(num * 1024 * 1024 * 1024 * 1024);
    default: return 0;
  }
}

export async function cleanItem(id: string): Promise<CleanResult> {
  const before = await scanItem(id);
  const beforeSize = before.size;

  try {
    const devDir = path.join(HOME, 'Developer');

    switch (id) {
      case 'next-dirs': {
        await execAsync(
          `find "${devDir}" -type d -name ".next" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true`,
          EXEC_OPTS,
        );
        return { id, bytesFreed: beforeSize, success: true };
      }

      case 'turbo-cache': {
        await execAsync(
          `find "${devDir}" -type d -name "cache" -path "*/.turbo/*" -exec rm -rf {} + 2>/dev/null || true`,
          EXEC_OPTS,
        );
        return { id, bytesFreed: beforeSize, success: true };
      }

      case 'expo-dirs': {
        await execAsync(
          `find "${devDir}" -type d -name ".expo" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true`,
          EXEC_OPTS,
        );
        return { id, bytesFreed: beforeSize, success: true };
      }

      case 'gradle-cache': {
        const gradleDir = path.join(HOME, '.gradle');
        await execAsync(
          `rm -rf "${path.join(gradleDir, 'caches')}" "${path.join(gradleDir, 'wrapper', 'dists')}" 2>/dev/null || true`,
          EXEC_OPTS,
        );
        return { id, bytesFreed: beforeSize, success: true };
      }

      case 'pnpm-store': {
        const { stdout } = await execAsync('pnpm store prune 2>&1', EXEC_OPTS);
        const after = await scanItem(id);
        return {
          id,
          bytesFreed: Math.max(0, beforeSize - after.size),
          success: true,
          output: stdout,
        };
      }

      case 'yarn-cache': {
        const yarnDir = path.join(HOME, 'Library', 'Caches', 'Yarn');
        await execAsync(`rm -rf "${yarnDir}"`, EXEC_OPTS);
        return { id, bytesFreed: beforeSize, success: true };
      }

      case 'cocoapods-cache': {
        const podsDir = path.join(HOME, 'Library', 'Caches', 'CocoaPods');
        await execAsync(`rm -rf "${podsDir}"`, EXEC_OPTS);
        return { id, bytesFreed: beforeSize, success: true };
      }

      case 'pip-cache': {
        const pipDir = path.join(HOME, 'Library', 'Caches', 'pip');
        await execAsync(`rm -rf "${pipDir}"`, EXEC_OPTS);
        return { id, bytesFreed: beforeSize, success: true };
      }

      case 'homebrew-cache': {
        try {
          await execAsync('brew cleanup -s 2>&1', EXEC_OPTS);
          const { stdout: cachePath } = await execAsync('brew --cache 2>/dev/null', { timeout: 10000 });
          const trimmed = cachePath.trim();
          if (trimmed && existsSync(trimmed)) {
            await execAsync(`rm -rf "${trimmed}" 2>/dev/null || true`, EXEC_OPTS);
          }
        } catch { /* best effort */ }
        const after = await scanItem(id);
        return { id, bytesFreed: Math.max(0, beforeSize - after.size), success: true };
      }

      case 'xcode-derived-data': {
        const ddDir = path.join(HOME, 'Library', 'Developer', 'Xcode', 'DerivedData');
        await execAsync(`rm -rf "${ddDir}"/*`, EXEC_OPTS);
        return { id, bytesFreed: beforeSize, success: true };
      }

      case 'core-simulator-unavailable': {
        const { stdout } = await execAsync(
          'xcrun simctl shutdown all 2>/dev/null; xcrun simctl delete unavailable 2>&1',
          EXEC_OPTS,
        );
        const after = await scanItem(id);
        return {
          id,
          bytesFreed: Math.max(0, beforeSize - after.size),
          success: true,
          output: stdout,
        };
      }

      case 'docker-system': {
        const { stdout } = await execAsync('docker system prune -a -f 2>&1', EXEC_OPTS);
        const after = await scanItem(id);
        return {
          id,
          bytesFreed: Math.max(0, beforeSize - after.size),
          success: true,
          output: stdout,
        };
      }

      case 'shipit-caches': {
        const cachesDir = path.join(HOME, 'Library', 'Caches');
        await execAsync(
          `find "${cachesDir}" -maxdepth 1 -name "*.ShipIt" -exec rm -rf {} + 2>/dev/null || true`,
          EXEC_OPTS,
        );
        return { id, bytesFreed: beforeSize, success: true };
      }

      case 'playwright-browsers': {
        const pwDir = path.join(HOME, 'Library', 'Caches', 'ms-playwright');
        await execAsync(`rm -rf "${pwDir}"`, EXEC_OPTS);
        return { id, bytesFreed: beforeSize, success: true };
      }

      case 'trash': {
        await execAsync(
          `osascript -e 'tell application "Finder" to empty trash'`,
          EXEC_OPTS,
        );
        return { id, bytesFreed: beforeSize, success: true };
      }

      default:
        return { id, bytesFreed: 0, success: false, error: 'Unknown cleanup item' };
    }
  } catch (error: any) {
    return { id, bytesFreed: 0, success: false, error: error.message || String(error) };
  }
}
