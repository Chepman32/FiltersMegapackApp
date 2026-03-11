import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import '../src/localization/i18n';
import { MixesScreen } from '../src/screens/MixesScreen';

const mockNavigate = jest.fn();
const mockStoreState = {
  mixes: [] as Array<{
    id: string;
    name: string;
    filterStack: {
      filterId: string;
      mixEnabled: boolean;
      mixFilterIds: string[];
      intensity: number;
      parameterValues: Record<string, number>;
    };
    createdAt: string;
    updatedAt: string;
  }>,
  applyMix: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../src/store/useStudioStore', () => ({
  useStudioStore: (selector: (state: typeof mockStoreState) => unknown) =>
    selector(mockStoreState),
}));

describe('MixesScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockStoreState.mixes = [];
    mockStoreState.applyMix.mockReset();
  });

  it('renders the empty state', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<MixesScreen />);
    });

    const texts = renderer!.root.findAllByType(Text).map(node => node.props.children).flat();
    expect(texts).toContain('No mixes yet');
    expect(texts).toContain(
      'Enable Mix in the editor and combine at least two filters to save one here.',
    );
  });

  it('opens a saved mix in the editor', async () => {
    mockStoreState.mixes = [
      {
        id: 'mix_1',
        name: 'Golden Frame + Neon Rush',
        filterStack: {
          filterId: 'neon-1',
          mixEnabled: true,
          mixFilterIds: ['cinematic-1', 'neon-1'],
          intensity: 1,
          parameterValues: {
            strength: 1,
            micro: 0.5,
          },
        },
        createdAt: '2026-03-11T09:00:00.000Z',
        updatedAt: '2026-03-11T10:00:00.000Z',
      },
    ];
    mockStoreState.applyMix.mockReturnValue(mockStoreState.mixes[0]);

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<MixesScreen />);
    });

    const [card] = renderer!.root.findAll(
      node => typeof node.props.onPress === 'function' && node.props.accessibilityRole === 'button',
    );
    await ReactTestRenderer.act(() => {
      card.props.onPress();
    });

    expect(mockStoreState.applyMix).toHaveBeenCalledWith('mix_1');
    expect(mockNavigate).toHaveBeenCalledWith('HomeTab', {
      screen: 'Editor',
    });
  });
});
