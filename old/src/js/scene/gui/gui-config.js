export const GUIConfig = [
	{
		enabled: true,
		key: 'Dir-1',
		props: {
			color: { intensity: { min: -10, max: 10, step: 0.01 } },
			position: { xmin: -10, xmax: 10, ymin: -10, ymax: 10, zmin: -10, zmax: 10 },
			target: { xmin: -10, xmax: 10, ymin: -10, ymax: 10, zmin: -10, zmax: 10 },
			frostum: { near: { min: 0.1, max: 50, mindif: 0.1 }, far: { min: 0.1, max: 50, mindif: 0.1 }, zoom: { min: 0.01, max: 1.5, mindif: 0.01 } },
		},
	},
]