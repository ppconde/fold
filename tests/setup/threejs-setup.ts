import { vi, afterEach } from 'vitest'

/**
 * ThreeJS global mocks
 */

// Mocking UUID because each mesh has an unique UUID
vi.mock('three', async (importOriginal) => {
    const three = await importOriginal<typeof import('three')>();
    return {
        ...three,
        Mesh: vi.fn().mockImplementation((geometry, material) => ({
            ...new three.Mesh(geometry, material),
            uuid: 'mock-uuid',
            geometry: 'mock-geometry-str',
        })),
        MeshStandardMaterial: vi.fn().mockImplementation((args) => ({
            ...new three.MeshStandardMaterial(args),
            uuid: 'mock-material-uuid',
        })),
    };
});

afterEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
});