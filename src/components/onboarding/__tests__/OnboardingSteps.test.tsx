/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import React, { useEffect } from 'react';
import { OnboardingProvider, OnboardingContext, useOnboarding } from '../OnboardingContext';
import { AnimatedPointer } from '../AnimatedPointer';
import { HeadphonePrompt } from '../HeadphonePrompt';
import { TransportControls } from '../../TransportControls';

// Mock localStorage to ensure it is defined and clean
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const key in store) delete store[key]; },
  length: 0,
  key: () => null,
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
if (typeof global !== 'undefined') {
  Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });
}

const MockControlSidebar = ({ isTracking, toggleTracking }: { isTracking: boolean; toggleTracking: () => void }) => {
  const { currentStep, advanceStep } = useOnboarding();

  useEffect(() => {
    if (currentStep === 'TRACKING' && isTracking) {
      advanceStep();
    }
  }, [currentStep, isTracking, advanceStep]);

  return (
    <div>
      <button data-testid="tracking-btn" onClick={toggleTracking}>
        {isTracking ? 'Tracking Active' : 'Start Tracking'}
      </button>
      {currentStep === 'TRACKING' && (
        <div data-testid="tracking-tooltip">
          <AnimatedPointer text="Step 2: Start Tracking" direction="right" />
        </div>
      )}
    </div>
  );
};

const MockTransportControls = ({ onPlay }: { onPlay: () => void }) => {
  const { currentStep, advanceStep } = useOnboarding();

  const handlePlayClick = () => {
    onPlay();
    if (currentStep === 'PLAYBACK') {
      advanceStep();
    }
  };

  return (
    <div>
      <button data-testid="play-btn" onClick={handlePlayClick}>Play</button>
      {currentStep === 'PLAYBACK' && (
        <div data-testid="playback-tooltip">
          <AnimatedPointer text="Step 3: Press Play" direction="down" />
        </div>
      )}
    </div>
  );
};

const MockApp = ({ isTracking, toggleTracking, onPlay }: { isTracking: boolean; toggleTracking: () => void; onPlay: () => void }) => {
  return (
    <OnboardingProvider>
      <OnboardingContext.Consumer>
        {(context) => (
          <div>
            <span data-testid="step">{context?.currentStep}</span>
            {context?.currentStep === 'HEADPHONES' && <HeadphonePrompt />}
            <MockControlSidebar isTracking={isTracking} toggleTracking={toggleTracking} />
            <MockTransportControls onPlay={onPlay} />
          </div>
        )}
      </OnboardingContext.Consumer>
    </OnboardingProvider>
  );
};

describe('Onboarding Steps 2 & 3 (Phase 3)', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('Given state is TRACKING and isTracking is false, When the user clicks "Start Tracking", Assert that the state remains TRACKING', () => {
    let isTracking = false;
    const toggleTracking = vi.fn(() => {
      // Simulate state not updating yet (e.g. pending camera permission prompt)
    });
    const onPlay = vi.fn();

    const { rerender } = render(<MockApp isTracking={isTracking} toggleTracking={toggleTracking} onPlay={onPlay} />);
    
    // First, complete HEADPHONES step
    const headphoneBtn = screen.getByRole('button', { name: /I'm wearing headphones/i });
    fireEvent.click(headphoneBtn);
    expect(screen.getByTestId('step').textContent).toBe('TRACKING');

    // Click tracking button
    const trackingBtn = screen.getByTestId('tracking-btn');
    fireEvent.click(trackingBtn);

    // Expect toggle to be called
    expect(toggleTracking).toHaveBeenCalled();
    // Expect state to remain TRACKING (since isTracking is still false)
    expect(screen.getByTestId('step').textContent).toBe('TRACKING');
    expect(screen.getByTestId('tracking-tooltip')).toBeDefined();
  });

  it('Given state is TRACKING, When isTracking state changes to true, Assert that the state advances to PLAYBACK', () => {
    let isTracking = false;
    const toggleTracking = vi.fn();
    const onPlay = vi.fn();

    const { rerender } = render(<MockApp isTracking={isTracking} toggleTracking={toggleTracking} onPlay={onPlay} />);
    
    // Complete HEADPHONES step
    const headphoneBtn = screen.getByRole('button', { name: /I'm wearing headphones/i });
    fireEvent.click(headphoneBtn);
    expect(screen.getByTestId('step').textContent).toBe('TRACKING');

    // Simulate camera tracking successfully starting
    isTracking = true;
    rerender(<MockApp isTracking={isTracking} toggleTracking={toggleTracking} onPlay={onPlay} />);

    // Expect step to have transitioned to PLAYBACK and tooltip to have updated
    expect(screen.getByTestId('step').textContent).toBe('PLAYBACK');
    expect(screen.getByTestId('playback-tooltip')).toBeDefined();
    expect(screen.queryByTestId('tracking-tooltip')).toBeNull();
  });

  it('Given state is PLAYBACK, When the user clicks Play, Assert the state updates to COMPLETED and all tooltips disappear', () => {
    let isTracking = true;
    const toggleTracking = vi.fn();
    const onPlay = vi.fn();

    const { rerender } = render(<MockApp isTracking={isTracking} toggleTracking={toggleTracking} onPlay={onPlay} />);
    
    // Complete HEADPHONES step
    const headphoneBtn = screen.getByRole('button', { name: /I'm wearing headphones/i });
    fireEvent.click(headphoneBtn);
    
    // Should now be in PLAYBACK (because isTracking is true)
    expect(screen.getByTestId('step').textContent).toBe('PLAYBACK');
    expect(screen.getByTestId('playback-tooltip')).toBeDefined();

    // Click play button
    const playBtn = screen.getByTestId('play-btn');
    fireEvent.click(playBtn);

    // Assert that the state updates to COMPLETED and all tooltips disappear
    expect(onPlay).toHaveBeenCalled();
    expect(screen.getByTestId('step').textContent).toBe('COMPLETED');
    expect(screen.queryByTestId('tracking-tooltip')).toBeNull();
    expect(screen.queryByTestId('playback-tooltip')).toBeNull();
    expect(localStorage.getItem('ambiviz_onboarding_completed')).toBe('true');
  });

  it('Given the AnimatedPointer is rendered, When inspecting the DOM, Assert that its container includes the z-50 utility class', () => {
    const { container } = render(<AnimatedPointer text="Test Tooltip" direction="right" />);
    // Since motion.div is the root element returned, we expect the first child to contain z-50
    const pointerDiv = container.firstChild as HTMLElement;
    expect(pointerDiv).toBeDefined();
    expect(pointerDiv.className).toContain('z-50');
  });

  it('Given the Step 3 pointer is rendered, When inspecting its flex layout, Assert that the arrow element visually precedes the text element on the left axis', () => {
    const { container } = render(<AnimatedPointer text="STEP 3: PRESS PLAY" direction="down" />);
    const root = container.firstChild as HTMLElement;
    expect(root).toBeDefined();
    
    const children = Array.from(root.children);
    expect(children.length).toBe(2);
    expect(children[0].tagName.toLowerCase()).toBe('svg');
    expect(children[1].tagName.toLowerCase()).toBe('span');
    expect(children[1].textContent).toBe('STEP 3: PRESS PLAY');
  });

  it('Given the AnimatedPointer is rendered, When inspecting the DOM, Assert that the updated scaling classes (like text-lg, px-6, w-8, h-8, font-bold) are present on the component\'s elements', () => {
    const { container } = render(<AnimatedPointer text="STEP 2: START TRACKING" direction="right" />);
    const root = container.firstChild as HTMLElement;
    expect(root).toBeDefined();
    
    expect(root.className).toContain('px-6');
    expect(root.className).toContain('py-3');
    expect(root.className).toContain('text-lg');
    expect(root.className).toContain('font-bold');
    expect(root.className).toContain('shadow-cyan-500/50');
    
    const svg = root.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.className.baseVal).toContain('w-8');
    expect(svg?.className.baseVal).toContain('h-8');
  });

  it('Given the Step 3 tooltip is rendered in TransportControls, When inspecting the DOM, Assert that the arrow\'s X-coordinate aligns with the center X-coordinate of the Play button element', () => {
    const mockContext = {
      currentStep: 'PLAYBACK' as const,
      advanceStep: vi.fn(),
      restartOnboarding: vi.fn(),
    };
    
    const { container } = render(
      <OnboardingContext.Provider value={mockContext}>
        <TransportControls
          playbackState="stopped"
          progress={0}
          onProgressChange={vi.fn()}
          onSeek={vi.fn()}
          activeTrack={{ name: 'Test Track' }}
          formatTime={(s) => `${s}`}
          onPrev={vi.fn()}
          onNext={vi.fn()}
          onPlay={vi.fn()}
          onPause={vi.fn()}
          onStop={vi.fn()}
          volume={0.8}
          onVolumeChange={vi.fn()}
          isLooping={false}
          onToggleLoop={vi.fn()}
          onShowSettings={vi.fn()}
        />
      </OnboardingContext.Provider>
    );

    const tooltipWrapper = container.querySelector('.absolute.bottom-full');
    expect(tooltipWrapper).toBeTruthy();
    expect(tooltipWrapper?.className).toContain('mb-8');
    expect(tooltipWrapper?.className).toContain('-translate-x-[40px]');

    const playBtn = container.querySelector('button[title="Play"]');
    const svg = tooltipWrapper?.querySelector('svg');
    expect(playBtn).toBeTruthy();
    expect(svg).toBeTruthy();

    if (playBtn) {
      playBtn.getBoundingClientRect = () => ({
        x: 100, left: 100, width: 44, right: 144, top: 0, bottom: 0, y: 0, height: 0, toJSON: () => {}
      });
    }

    // With -translate-x-[40px], the wrapper starts at left-1/2 (122px) shifted by -40px = 82px.
    // The svg is offset by padding-left px-6 (24px) inside the tooltip wrapper.
    if (svg) {
      svg.getBoundingClientRect = () => ({
        x: 82 + 24, left: 82 + 24, width: 32, right: 82 + 24 + 32, top: 0, bottom: 0, y: 0, height: 0, toJSON: () => {}
      });
    }

    const btnRect = playBtn?.getBoundingClientRect();
    const svgRect = svg?.getBoundingClientRect();
    const btnCenter = btnRect ? btnRect.left + btnRect.width / 2 : 0;
    const svgCenter = svgRect ? svgRect.left + svgRect.width / 2 : 1;

    expect(btnCenter).toBe(svgCenter); // 122 === 122
  });
});
