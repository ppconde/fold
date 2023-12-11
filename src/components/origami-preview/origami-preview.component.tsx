import { useEffect, useState } from "react";
import { cacheService } from "../../services/cache-service";

interface IOrigamiPreviewComponentProps {
  name: string;
}

export const OrigamiPreviewComponent = (
  props: IOrigamiPreviewComponentProps
) => {
  const [image, setImage] = useState("");

  useEffect(() => {
    const image = cacheService.getItem(props.name.toLowerCase());
    setImage(JSON.parse(image ?? ""));
  }, [props.name]);

  return (
    <div className="origami-preview">
      <img src={image} alt="Some Origami 🧻" className="image" />
      <span className="text">{props.name}</span>
    </div>
  );
};
