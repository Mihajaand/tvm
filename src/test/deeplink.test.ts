import { beforeEach, describe, expect, it } from 'vitest';
import { getCurrentRoute } from '../utils/deeplink';

describe('authenticated deep links', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('restores the Performance page from the reviews hash', () => {
    window.location.hash = '#/reviews';

    expect(getCurrentRoute()).toEqual({ path: 'performance-review', params: null });
  });

  it('restores other authenticated routes and strips hash query parameters', () => {
    window.location.hash = '#/dashboard?source=shortcut';

    expect(getCurrentRoute()).toEqual({ path: 'dashboard', params: null });
  });
});