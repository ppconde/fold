import { useState, useEffect } from 'react';
import { ControlsComponent } from './components/controls/controls-component';
import { HeaderComponent } from './components/header/header.component';
import { SideMenuComponent } from './components/side-menu/side-menu.component';
import { CACHE } from './constants/cache-constants';
import { Canvas } from './scene/canvas';
import { cacheService } from './services/cache-service';
import { supabaseService } from './services/db-service';
import { IOrigami } from './types/origami-db.types';
import useEventListener from './hooks/use-event-listener';

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
      new Canvas(document.getElementById('canvas') as HTMLCanvasElement);
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

    init();
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
      <canvas id="canvas"></canvas>
      <ControlsComponent />
    </main>
  );
};
