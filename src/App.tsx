import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Perf } from 'r3f-perf';
import { ControlsComponent } from './components/controls/controls-component';
import { HeaderComponent } from './components/header/header.component';
import { SideMenuComponent } from './components/side-menu/side-menu.component';
import { CACHE } from './constants/cache-constants';
import { cacheService } from './services/cache-service';
import { supabaseService } from './services/db-service';
import { IOrigami } from './types/origami-db.types';
import useEventListener from './hooks/use-event-listener';
import { OBJECT_NAMES } from './scene/constants/object-names.constants';
import { Origami } from './scene/models/origami/origami';

export const App = () => {
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [menuType, setMenuType] = useState('');
  const [loading, setLoading] = useState(true);

  /**
   * Adds a click event listener when there's a click on top of side menu
   * it closes the side menu when the click is outside the menu
   */
  useEventListener('click', ({ target }: Event) => {
    const element = document.querySelector('.side-menu');
    const isClickedInsideSideMenu = element !== target && element?.contains(target as Node);

    if (!isClickedInsideSideMenu) {
      setShowSideMenu(false);
      setMenuType('');
    }
  });

  useEffect(() => {
    /**
     * Initialize the app
     */
    const init = async () => {
      // new Canvas(document.getElementById('canvas') as HTMLCanvasElement);
      try {
        const library = await supabaseService.getOrigamiLibrary();
        if (library.length) {
          cacheService.setItem(CACHE.ORIGAMI, library);
          setOrigamiImages(library);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error initializing:', error);
      }
    };
    // window.debug = new Debug();
    init();

    // return () => {
    //   window.debug.ui?.destroy();
    // };
  }, []);

  /**
   * Renders side menu component
   */
  const renderSideMenu = () => {
    return showSideMenu ? (
      <SideMenuComponent key={menuType} menuType={menuType} activateSideMenu={activateSideMenu} loading={loading} />
    ) : null;
  };

  /**
   * Toggles side menu when there's a click inside the menu button
   * @param e
   */
  const activateSideMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    const target = e.target as HTMLElement;

    setShowSideMenu(!!target.innerText || false);
    setMenuType(target.innerText.toLowerCase());
  };

  /**
   * Load origami images from supabase storage and sets them into cache
   * @param library
   */
  const setOrigamiImages = async (library: IOrigami[]) => {
    for (const origami of library) {
      const origamiName = origami.name.toLowerCase();
      const imgUrl = await supabaseService.getOrigamiImage(origamiName);
      cacheService.setItem(origamiName, imgUrl);
    }
  };

  return (
    <main className="main">
      <HeaderComponent activateSideMenu={activateSideMenu} />
      {renderSideMenu()}
      <Canvas>
        <OrbitControls />
        <Perf />
        <perspectiveCamera fov={65} aspect={2} near={0.1} far={500} />
        <directionalLight
          name={OBJECT_NAMES.DIRECTIONAL_LIGHT_1}
          intensity={1.8}
          position={[60, 41, 45]}
          color="white"
          castShadow={true}
          shadow-mapsize={[2048, 2048]}
          shadow-bias={-0.0001}
        />
        <directionalLight
          name={OBJECT_NAMES.DIRECTIONAL_LIGHT_2}
          intensity={0.7}
          position={[-60, -3, -87]}
          color="white"
          castShadow={true}
          shadow-mapsize={[2048, 2048]}
          shadow-bias={-0.0001}
        />
        <ambientLight name={OBJECT_NAMES.AMBIENT_LIGHT_1} intensity={1.5} color={0xfeffeb} />
        <Origami
          instructions={`paper dimensions: [1]
          fold [c] to top of [a]
          fold [b] to top of [d]
          fold [b] around [a, e]
          fold [b] to top of [e]
          fold [d] to top of [e]
          fold [g, f] to bottom of [c, f]
          fold [i, j] to bottom of [c, f]
          fold [m, p] to bottom of [n, q]
          fold [a] around [m, p]`}
        />
      </Canvas>
      ,
      <ControlsComponent />
    </main>
  );
};
