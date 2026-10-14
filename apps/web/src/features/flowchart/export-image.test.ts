import { afterEach, describe, expect, it, vi } from 'vitest';
import { canShareImage, downloadImage, imageFile } from './export-image';

const blob = () => new Blob(['png'], { type: 'image/png' });

function stubShare(canShare: boolean) {
  const share = vi.fn();
  Object.defineProperty(navigator, 'canShare', { value: vi.fn(() => canShare), configurable: true });
  Object.defineProperty(navigator, 'share', { value: share, configurable: true });
  return share;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, 'canShare');
  Reflect.deleteProperty(navigator, 'share');
  Reflect.deleteProperty(URL, 'createObjectURL');
  Reflect.deleteProperty(URL, 'revokeObjectURL');
});

describe('imageFile', () => {
  it('names the PNG so the share sheet and the download folder show it', () => {
    const file = imageFile(blob());
    expect(file.name).toBe('fluxograma.png');
    expect(file.type).toBe('image/png');
  });
});

describe('canShareImage', () => {
  it('is true when the browser accepts the PNG in the share sheet', () => {
    stubShare(true);
    expect(canShareImage(blob())).toBe(true);
  });

  it('is false when the browser cannot share files', () => {
    stubShare(false);
    expect(canShareImage(blob())).toBe(false);
    Reflect.deleteProperty(navigator, 'canShare');
    expect(canShareImage(blob())).toBe(false);
  });
});

describe('downloadImage', () => {
  it('downloads through an object URL and releases it after the download starts', () => {
    vi.useFakeTimers();
    const revoke = vi.fn();
    URL.createObjectURL = vi.fn(() => 'blob:png');
    URL.revokeObjectURL = revoke;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadImage(blob());

    expect(click).toHaveBeenCalledTimes(1);
    const link = click.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(link.download).toBe('fluxograma.png');
    expect(link.href).toBe('blob:png');
    expect(revoke).not.toHaveBeenCalled();

    vi.advanceTimersByTime(10_000);
    expect(revoke).toHaveBeenCalledWith('blob:png');
  });
});
