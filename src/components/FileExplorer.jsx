import { useState } from 'react';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import JavascriptIcon from '@mui/icons-material/Javascript';
import HtmlIcon from '@mui/icons-material/Html';
import CssIcon from '@mui/icons-material/Css';
import DescriptionIcon from '@mui/icons-material/Description';

function FileExplorer({ onFileSelect, files, setFiles }) {
  const [expandedFolders, setExpandedFolders] = useState(new Set(['src']));

  const getFileIcon = (name, type) => {
    if (type === 'folder') return <FolderIcon fontSize="small" className="text-yellow-600" />;
    
    const extension = name.split('.').pop().toLowerCase();
    switch (extension) {
      case 'html':
        return <HtmlIcon fontSize="small" className="text-orange-600" />;
      case 'css':
        return <CssIcon fontSize="small" className="text-blue-600" />;
      case 'js':
      case 'jsx':
        return <JavascriptIcon fontSize="small" className="text-yellow-500" />;
      case 'json':
        return <DescriptionIcon fontSize="small" className="text-yellow-300" />;
      case 'md':
        return <DescriptionIcon fontSize="small" className="text-gray-400" />;
      default:
        return <InsertDriveFileIcon fontSize="small" className="text-gray-400" />;
    }
  };

  const toggleFolder = (path) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const renderTree = (tree, path = '') => {
    return Object.entries(tree).map(([name, node]) => {
      const fullPath = path ? `${path}/${name}` : name;
      
      if (node.type === 'folder') {
        const isExpanded = expandedFolders.has(fullPath);
        return (
          <div key={fullPath} className="folder overflow-auto ">
            <div 
              className="flex items-center gap-2 px-2 py-1 hover:bg-gray-800 cursor-pointer"
              onClick={() => toggleFolder(fullPath)}
            >
              <span className="text-gray-500">
                {isExpanded ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
              </span>
              <span>{getFileIcon(name, 'folder')}</span>
              <span className="text-gray-300">{name}</span>
            </div>
            {isExpanded && (
              <div className="ml-4">
                {renderTree(node.children, fullPath)}
              </div>
            )}
          </div>
        );
      }

      return (
        <div
          key={fullPath}
          className="flex items-center gap-2 px-2 py-1 hover:bg-gray-800 cursor-pointer"
          onClick={() => onFileSelect({ name, path: fullPath, content: node.content })}
        >
          <span className="invisible"><KeyboardArrowRightIcon fontSize="small" /></span>
          <span>{getFileIcon(name, 'file')}</span>
          <span className="text-gray-300">{name}</span>
        </div>
      );
    });
  };

  return (
    <div className="bg-gray-900 text-sm h-full min-w-[200px]  overflow-auto">
      <h2 className="text-gray-400 uppercase text-xl font-bold mb-2 px-2">Explorer</h2>
      {renderTree(files)}
    </div>
  );
}

export default FileExplorer; 