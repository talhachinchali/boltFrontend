import React, { useEffect, useState } from 'react'
import sendIcon from '../assets/send.svg'; // Adjust the path as necessary
import './Steps.css';
import plusIcon from '../assets/Plus.svg';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

function Steps({steps,setViewMode,getAIResponse,files}) {
  const [prompt, setPrompt] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [fileList, setFileList] = useState([]);
  

  const handleSubmit = () => {
    let fullPrompt
    if(selectedFileName){
      fullPrompt = "fileName:"+selectedFileName+"\n"+fileContent + "\n"+prompt+"\n"+"and give me the code for perticular file only";
    }else{
      fullPrompt =prompt;
    }
    getAIResponse({
      variables: {
        prompt: fullPrompt,
        sessionId: "123",
        messages: []
      }
    });
    console.log(fullPrompt);
    setPrompt('');
    setFileContent('');
    setSelectedFileName('');
  };

  const handleFileSelect = (file) => {
    console.log("Selected file:", file);
    const content = fetchFileContent(file);
    setFileContent(content);
    setSelectedFileName(file);
    setPrompt('');
    setShowFileSelector(false);
  };

  // Function to fetch file content (you need to implement this)
  const fetchFileContent = (filePath) => {
    console.log("Fetching file content for:", filePath);
    
    const findFileContent = (fileStructure, pathParts) => {
      if (pathParts.length === 0) return null;
      
      const [currentPart, ...remainingParts] = pathParts;
      const currentFile = fileStructure[currentPart];
      
      if (!currentFile) return null;
      
      if (remainingParts.length === 0) {
        return currentFile.content || "File content not found";
      }
      
      if (currentFile.type === 'folder') {
        return findFileContent(currentFile.children, remainingParts);
      }
      
      return null;
    };

    const pathParts = filePath.split('/');
    const fileContent = findFileContent(files, pathParts);
    
    // console.log("File content:", fileContent);
    return fileContent;
  };
  const handlePlusClick = () => {
    setFileList(generateFileList(files));
    setShowFileSelector(true);
  };

  const generateFileList = (fileStructure, path = '') => {
    let fileList = [];
    for (const [name, info] of Object.entries(fileStructure)) {
      const currentPath = path ? `${path}/${name}` : name;
      if (info.type === 'file') {
        fileList.push(currentPath);
      } else if (info.type === 'folder') {
        fileList = fileList.concat(generateFileList(info.children, currentPath));
      }
    }
    return fileList;
  };
  // console.log(steps,"steps everybody in the sheda");

  return (
    <div className="flex flex-col bg-gray-900 h-[100%]  text-gray-400 uppercase relative overflow-y-auto">
    <h2 className="text-xl font-bold mb-4">Steps</h2>
    <div className="space-y-2 text-xs p-2 h-[80%] overflow-y-auto scrollbar-hide">
      {steps.map((step) => (
       <>
       {step.type==="title" && <div className="flex items-center gap-2 bg-gray-800 p-2 rounded-md">
       <p className='text-xs text-white'> {step.title}</p>
       </div>
}
     
       {(step.type==="createFile"||step.type==="file") && <div className="flex items-center gap-2 ">
          <span className={`w-2 h-2 rounded-full ${
            step.status === 'completed' ? 'bg-green-500' : 'bg-gray-500'
          }`}></span>
          <p>{step.id}. {step.name}</p>
        </div>}
        {step.type==="shell" && <div className="flex items-center gap-2  ">
          <span className={`w-2 h-2 rounded-full ${
            step.status === 'completed' ? 'bg-green-500' : 'bg-gray-500'
          }`}></span>
          <p className='text-xs text-green-400 lowercase cursor-pointer' 
          onClick={()=>{
            if(step.content==="npm run dev"){
              setViewMode("preview")
            }
          }}
          > {step.content}</p>
        </div>}
        {step.type==="description" && <div className="flex items-center gap-2 bg-gray-800 p-2 rounded-md">
        <p className='text-xs text-white'> {step.content}</p>
        </div>}
        </>
      ))}
    </div>
    {showFileSelector && (
        <div className="absolute bottom-[20%] left-0 w-full h-1/2 bg-gray-700 text-white p-4 overflow-y-auto text-xs scrollbar-hide">
         
          <ul>
            {fileList.map((file, index) => (
              <li  key={index} onClick={() => handleFileSelect(file)} className="cursor-pointer mb-2">
                {file}
              </li>
            ))}
          </ul>
        </div>
      )}
    {/* chat input */}
    <div className="absolute bottom-0 w-full h-[20%] bg-gray-800 p-2 relative">
      {selectedFileName && (
        <div className="absolute left-2 top-2 text-[10px] text-gray-600 ml-2 mt-1 lowercase">
         <InsertDriveFileIcon className="w-2 h-2" style={{color:"grey",fontSize:"15px"}} /> {selectedFileName}
        </div>
      )}
      <input
        type="text"
        value={prompt}
        style={{fontSize:"10px"}}
        onChange={(e) => setPrompt(e.target.value)}
        className="w-full h-full p-2 text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Ask AI for code modifications..."
      />
          <button onClick={handlePlusClick} className="absolute bottom-2 left-2 bg-black-500 text-white p-1 m-2 rounded-full border border-gray-900">
   <img src={plusIcon} alt="Plus" className="w-4 h-4 svg-w" />
      </button>
      <button onClick={handleSubmit} className="absolute right-2 bottom-2 bg-black-500 text-white p-1 rounded-full border border-gray-900 m-2">
        <img src={sendIcon} alt="Send" className="w-4 h-4" />
      </button>

   
    </div>
  </div>
  )
}

export default Steps