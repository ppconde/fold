import React from "react";
import SearchIcon from "./search.svg?react";

interface ISearchBarComponentProps {
  setSearchText: (text: string) => void;
}

export const SearchBarComponent = (props: ISearchBarComponentProps) => {
  /**
   * Handles search input change
   * @param e
   */
  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { setSearchText } = props;
    setSearchText(e.target.value.toLowerCase());
  };

  return (
    <div className="search-bar">
      <div className="wrapper">
        <SearchIcon className="icon" />
        <input
          type="text"
          className="search"
          placeholder="Search your origami"
          onChange={onSearchChange}
        />
      </div>
    </div>
  );
};
