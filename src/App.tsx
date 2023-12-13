import { useState, useEffect } from "react";
import { ControlsComponent } from "./components/controls/controls-component";
import { HeaderComponent } from "./components/header/header.component";
import { SideMenuComponent } from "./components/side-menu/side-menu.component";
import { CACHE } from "./constants/cache-constants";
import { Canvas } from "./scene/canvas";
import { cacheService } from "./services/cache-service";
import { supabaseService } from "./services/db-service";
import { IOrigami } from "../types/origami-db.types";

export const App = () => {
  const [{ showSideMenu, menuType }, setShowSideMenu] = useState({
    showSideMenu: false,
    menuType: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /**
     * Initializes the application
     */
    const init = async () => {
      const canvas = document.getElementById("canvas")! as HTMLCanvasElement;
      new Canvas(canvas);
      addClickEventListener();

      const library = await supabaseService.getOrigamiLibrary();
      if (library.length) {
        cacheService.setItem(CACHE.ORIGAMI, library);
        setOrigamiImages(library);
      }
      setLoading(false);
    };

    init();
  }, []);

  /**
   * Renders side menu component
   */
  const renderSideMenu = () => {
    return showSideMenu ? (
      <SideMenuComponent
        key={menuType}
        menuType={menuType}
        activateSideMenu={activateSideMenu}
        loading={loading}
      />
    ) : null;
  };

  /**
   * Toggles side menu when there's a click inside the menu button
   * @param {*} e
   */
  const activateSideMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    const target = e.target as HTMLElement;

    setShowSideMenu({
      showSideMenu: !!target.innerText || false,
      menuType: target.innerText.toLowerCase(),
    });
  };

  /**
   * Adds a click event listener when there's a click on top of side menu
   */
  const addClickEventListener = () => {
    window.addEventListener("click", ({ target }: Event) => {
      const element = document.querySelector(".side-menu");
      const isClickedInsideSideMenu =
        element !== target && element?.contains(target as Node);

      if (!isClickedInsideSideMenu) {
        setShowSideMenu({ showSideMenu: false, menuType: "" });
      }
    });
  };

  /**
   * Load origami images from supabase storage and sets them into cache
   * @param library
   */
  const setOrigamiImages = (library: IOrigami[]) => {
    library.forEach(async (origami) => {
      const origameName = origami.name.toLowerCase();
      const img = await supabaseService.getOrigamiImage(origameName);
      cacheService.setItem(origameName, img);
    });
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
