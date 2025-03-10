import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, gql, useLazyQuery } from '@apollo/client';
import FileExplorer from './FileExplorer';
import parseXMLContent from './xmlParser';
import Editor from "@monaco-editor/react";
import { WebContainer } from '@webcontainer/api';
import Preview from './Preview';
import { useWebContainer } from '../hooks/useWebContainer';
import {marked} from 'marked';
import { useMonaco } from "@monaco-editor/react";
import { X } from '@mui/icons-material';
import TerminalComponent from './Terminal';
import SplitPane from 'react-split-pane';
import Steps from './Steps';

const GET_TEMPLATE = gql`
  query GetTemplate($prompt: String!) {
    template(prompt: $prompt) {
      prompts
      uiPrompts
    }
  }
`;

const ASK_AI = gql`
  query AskAI($prompt: String!, $suggestions: String, $sessionId: String!, $messages: [String!]) {
    askAi(prompt: $prompt, suggestions: $suggestions,sessionId: $sessionId, messages: $messages){
      response
      suggestions
    }
  }
`;

const SUGGEST_CODE = gql`
  query SuggestCode($prompt: String!) {
    suggestCode(prompt: $prompt)
  }
`;

function Workspace() {
  const location = useLocation();
  const { prompt } = location.state || { prompt: '' };
  const [isInitializedServer, setIsInitializedServer] = useState(false);
  const [url, setUrl] = useState(null);
  // Add GraphQL query
  const { loading, error, data } = useQuery(GET_TEMPLATE, {
    variables: { prompt },
    skip: !prompt // Skip the query if there's no prompt
  });

  // Add lazy query hook
  const [getAIResponse, { data: aiResponse }] = useLazyQuery(ASK_AI);

  // Add lazy query hook for suggestions
  const [getSuggestions, { data: suggestionsData }] = useLazyQuery(SUGGEST_CODE);

  // Add state for messages
  const [messages, setMessages] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [uiPrompts, setUiPrompts] = useState([]);

  // Add state for suggestions
  const [suggestions, setSuggestions] = useState(["hello"]);

  // Update prompts and messages when data is received
  useEffect(() => {
    if (data?.template) {
      setPrompts(data.template.prompts);
      setUiPrompts(data.template.uiPrompts);
      let uiPromptsdecoded = parseXMLContent(data.template.uiPrompts[0]);
      
      // Transform the decoded files into the required structure
      const newFiles = {};
      uiPromptsdecoded.forEach(file => {
        const pathParts = file.path.split('/');
        let current = newFiles;
        
        // Create nested folder structure
        for (let i = 0; i < pathParts.length - 1; i++) {
          const part = pathParts[i];
          if (!current[part]) {
            current[part] = {
              type: 'folder',
              children: {}
            };
          }
          current = current[part].children;
        }
        
        // Add the file
        const fileName = pathParts[pathParts.length - 1];
        current[fileName] = {
          type: 'file',
          content: file.content
        };
      });

      setFiles(newFiles);

      const newMessages = [
        data.template.prompts[0],
        data.template.uiPrompts[0],
        prompt+" give only .tsx extension"
      ];
      
      setMessages(newMessages);

      // Call askAi query with the messages
      getAIResponse({
        variables: {
          prompt: prompt ,
          sessionId: "123",
          messages: newMessages
        }
      });
    }
  }, [data, prompt, getAIResponse]);


//  useEffect(()=>{
//     console.log(suggestions,"suggestions");
//  },[suggestions])
useEffect(() => {
    if (aiResponse) {
       
if(aiResponse.askAi.response){
  const actions = parseXMLContent(aiResponse.askAi.response);
    console.log(actions, "actions");
      setSteps(prevSteps => [
        ...prevSteps,
        ...actions.map((action, index) => ({

          id: prevSteps.length + index + 1,
          title: action.type==="title" ? action.title : null,
          name: `${action.title}`,
          type: action.type,
          status: 'pending',
          content:(action.type==="shell"||action.type==="description")? action.content : null
        }))
      ]);
      // Process each action and update the files state
      actions.forEach(action => {
        if (action.type === 'file' && action.path && action.content) {
          // Update or create the file at the specified path
          setFiles(prevFiles => {
            const newFiles = JSON.parse(JSON.stringify(prevFiles));
            const pathParts = action.path.split('/');
            
            let current = newFiles;
            
            // Create nested folder structure if it doesn't exist
            for (let i = 0; i < pathParts.length - 1; i++) {
              const part = pathParts[i];
              if (!current[part]) {
                current[part] = {
                  type: 'folder',
                  children: {}
                };
              }
              current = current[part].children;
            }
            
            // Add or update the file
            const fileName = pathParts[pathParts.length - 1];
            // console.log(current[fileName],"fileName omg");
            current[fileName] = {
              type: 'file',
              content: action.content
            };
            
            return newFiles;
          });

          // Update the step status to true
          setSteps(prevSteps => prevSteps.map(step => 
            step.name === action.title ? { ...step, status: 'completed' } : step
          ));
        }
      });

      setSteps(prevSteps => prevSteps.map(step => 
        step.type === "shell" ? { ...step, status: 'completed' } : step
      ));
    }

    }
  }, [aiResponse]);

  useEffect(() => {
    if (suggestionsData) {
      // const markdownContent = suggestionsData.suggestCode;
      // const htmlContent = marked(markdownContent);
      setSuggestions([suggestionsData.suggestCode]);
    }
  }, [suggestionsData]);

  const [selectedFile, setSelectedFile] = useState(null);
  const [viewMode, setViewMode] = useState('code'); // 'code' or 'preview'
  const [steps, setSteps] = useState([
    {
      id: 1,
      name: 'Initialize project structure',
      type: 'createFile',
      status: 'completed'
    },
    {
      id: 2,
      name: 'Create basic HTML layout',
      type: 'createFile',
      status: 'completed'
    },
    {
      id: 3,
      name: 'Add styling',
      type: 'createFile',
      status: 'completed'
    }
  ]);
  const [files, setFiles] = useState({
    'src': {
      type: 'folder',
      children: {
        'index.html': { type: 'file', content: '<!-- HTML content -->' },
        'components': {
          type: 'folder',
          children: {
            'Header.jsx': { type: 'file', content: '// Header component' }
          }
        },
        // ... rest of the file structure
      }
    }
  });

  const handleFileSelect = ({ name, path, content }) => {
    setSelectedFile({ name, path, content });
    setViewMode("code");
  };

  const updateFileContent = (path, newContent) => {
    console.log("path",path);
   
    setFiles(prevFiles => {
      const newFiles = JSON.parse(JSON.stringify(prevFiles));
      const pathParts = path.split('/');
     
      let current = newFiles;
      
      // Navigate to the parent folder
      for (let i = 0; i < pathParts.length - 1; i++) {
        current = current[pathParts[i]]?.children;
      }
     
      // Update the file content
      current[pathParts[pathParts.length - 1]].content = newContent;
      return newFiles;
    });
  };

  const monaco = useMonaco();
  const editorRef = useRef(null);

  // State to cache suggestions
  const [cachedSuggestions, setCachedSuggestions] = useState([]);

  // Store the current cursor position using a ref
  const cursorPositionRef = useRef({ lineNumber: 1, column: 1 });

  // Add a ref to store the timeout ID
  const typingTimeoutRef = useRef(null);

  const convertFilesToWebContainerFormat = (filesObj) => {
    const result = {};
    
    function processNode(node, path = '') {
      const currentPath = path.replace(/^\/+/, ''); // Remove leading slashes but preserve case
      
      if (node.type === 'file') {
        // Get the parent directory path and filename with original case
        const pathParts = currentPath.split('/');
        const fileName = pathParts.pop();
        const dirPath = pathParts.join('/');
        
        // Create nested directory structure
        let current = result;
        if (dirPath) {
          dirPath.split('/').forEach(dir => {
            if (!current[dir]) {
              current[dir] = { directory: {} };
            }
            current = current[dir].directory;
          });
        }
        
        // Add the file with original case
        current[fileName] = {
          file: {
            contents: node.content
          }
        };
      } else if (node.type === 'folder' && node.children) {
        Object.entries(node.children).forEach(([childName, childNode]) => {
          const childPath = path ? `${path}/${childName}` : childName;
          processNode(childNode, childPath);
        });
      }
    }
    
    Object.entries(filesObj).forEach(([name, node]) => {
      processNode(node, name);
    });
    
    return result;
  };

  // Function to fetch suggestions using your existing GraphQL query
  const fetchSuggestions = (context, lineNumber) => {
    // console.log(`Fetching suggestions for line ${lineNumber} with context:`, context);
    getSuggestions({
      variables: {
        prompt: context,
      },                  
    }).then((response) => {
      if (response.data.suggestCode) {
        const markdownContent = response.data.suggestCode;
      const htmlContent = marked(markdownContent);
      console.log(htmlContent,"htmlContent"); 
        setCachedSuggestions((prev) => [...prev, htmlContent]);
      }
    });
  };

  // Handle editor changes
  const handleEditorChange = (value, event) => {
    setSuggestions([]);
    setSelectedFile({
      ...selectedFile,
      content: value,
    });
    updateFileContent(selectedFile.path, value);

    // Clear the previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set a new timeout
    typingTimeoutRef.current = setTimeout(() => {
      const { lineNumber, column } = cursorPositionRef.current; // Use the current cursor position from ref
      const lines = value.split('\n');
      
      // Get the 10 lines above and below the current line
      const startLine = Math.max(0, lineNumber - 11);
      const endLine = Math.min(lines.length, lineNumber + 10);
      const contextLines = lines.slice(startLine, endLine);

      // Insert the marker at the specific column
      const marker = '/* SUGGESTION_POINT */';
      const lineIndex = lineNumber - startLine - 1;
      const lineContent = contextLines[lineIndex];
      
      // Ensure the column index is within the bounds of the line content
      const adjustedColumn = column-1;
      // console.log(adjustedColumn, "adjustedColumn while calling");
      contextLines[lineIndex] = lineContent?.slice(0, adjustedColumn) + marker + lineContent?.slice(adjustedColumn);

      // Join the context lines into a single string
      const contextWithMarker = contextLines.join('\n');

      // Pass the context with the marker
      fetchSuggestions(contextWithMarker);
    }, 4000); // Adjust the delay as needed (e.g., 1000ms for 1 second)
  };

  useEffect(() => {
    if (!monaco || suggestions.length === 0) {
      // console.log("Monaco not available or suggestions are empty, skipping registration.");
      return;
    }
  
    // console.log("Monaco instance is available with suggestions:", suggestions);
  
    // Register the inline completion provider
    let provider = monaco.languages.registerInlineCompletionsProvider("javascript", {
      provideInlineCompletions: async (model, position) => {
        cursorPositionRef.current = position;
        // console.log("Generating new suggestions at:", position, suggestions); // Log the latest suggestions
  
        return {
          items: suggestions.map((suggestion, index) => ({
            insertText: suggestion,
            range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
            kind: monaco.languages.CompletionItemKind.Text,
            sortText: String(index),
          })),
          dispose: () => {},
        };
      },
      freeInlineCompletions: () => {},
    });
  
    // console.log("Provider registered with new suggestions:", suggestions);
  
    // Get the editor instance (instead of the model)
    const editor = monaco.editor.getEditors()[0]; 
    
    if (editor) {
      // console.log("editor instance");
      editor.onDidChangeCursorPosition((event) => {
        // console.log(event.position,"jaduuu");
        cursorPositionRef.current = event.position;
      });
editor.addCommand(monaco.KeyCode.Tab, () => {
  console.log("tab pressed");
      const position = editor.getPosition();
      const model = editor.getModel();
      const lineContent = model.getLineContent(position.lineNumber);
      
      // Check if there is a suggestion available
      if (suggestions.length > 0) {
        const suggestion = suggestions[0]; // Use the first suggestion for simplicity
        
        // Insert the suggestion and move the cursor to the end
        const newPosition = {
          lineNumber: position.lineNumber,
          column: position.column + suggestion.length
        };
        // console.log(newPosition,"newPosition everybody");
        editor.executeEdits('', [{
          range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
          text: suggestion,
          forceMoveMarkers: true
        }]);
        editor.setPosition(newPosition);
        cursorPositionRef.current = newPosition;
        // console.log("completed----------------");
        setSuggestions([]);
      }
    });

      // console.log("Triggering inline suggestion refresh.");
      editor.trigger('keyboard', 'editor.action.inlineSuggest.trigger', {}); // Manually trigger inline suggestions
    } else {
      console.log("Editor instance not found.");
    }
  
    // Dispose old provider when `suggestions` changes
    return () => {
      console.log("Disposing old provider.");
      provider.dispose();
    };
  }, [monaco, suggestions]);

  useEffect(()=>{
    if(monaco){
   
    
    const editor = monaco.editor.getEditors()[0];
    editor?.onDidChangeCursorPosition((event) => {
      cursorPositionRef.current = event.position;
    });
  
  }
  },[monaco])
  
  // Now it will refresh only when `suggestions` is populated
  // useEffect(()=>{
  //   console.log(cursorPositionRef.current,"cursorPosition++++++++++++++++++++++");
  // },[cursorPositionRef.current])
  const { webcontainer, error: webcontainerError } = useWebContainer();
  const [isInitialized, setIsInitialized] = useState(false);

  // Split into two separate effects - one for initialization, one for file mounting
  useEffect(() => {
    if (webcontainer && !isInitialized) {
      // console.log("Initializing webcontainer");
      setIsInitialized(true);
      
      // Run npm install and start - only once
      const setupContainer = async () => {
        try {
          // console.log('Starting npm install...');
          const installProcess = await webcontainer.spawn('npm', ['install']);
          const installExit = await installProcess.exit;
          
          if (installExit !== 0) {
            throw new Error('npm install failed');
          }

          // console.log('Starting npm run dev...');
          const startProcess = await webcontainer.spawn('npm', ['run', 'dev']);
          // startProcess.output.pipeTo(new WritableStream({
          //   write(data) {
          //     console.log('Server output:', data);
          //   }
          // }));
        } catch (error) {
          console.error('Container setup failed:', error);
        }
      };

      setupContainer();
    }
  }, [webcontainer]); // Only depend on webcontainer

  // Separate effect for mounting files
  useEffect(() => {
    if (webcontainer && isInitialized && files) {
    //   console.log("Mounting updated files",files);
      const webContainerFiles = convertFilesToWebContainerFormat(files);
      webcontainer.mount(webContainerFiles).then(() => {
        // console.log('Files mounted successfully',webContainerFiles);
      });
    }
  }, [files, webcontainer, isInitialized]);

  // Function to handle suggestion selection
  const handleSuggestionSelect = (suggestion) => {
    if (selectedFile) {
      const updatedContent = selectedFile.content + '\n' + suggestion;
      updateFileContent(selectedFile.path, updatedContent);
      setSelectedFile({
        ...selectedFile,
        content: updatedContent
      });
    }
  };

  // Example usage: Call this function when a line is selected
  const handleLineSelection = (line) => {
    console.log(line,"line");
    // fetchSuggestions(line);
  };

  // State to track the height of the terminal
  const [terminalHeight, setTerminalHeight] = useState(20); // Initial height in percentage

  // Ref to store the animation frame ID
  const animationFrameIdRef = useRef(null);

  // Function to handle the mouse down event for resizing
  const handleMouseDown = (e) => {
      e.preventDefault();
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
  };

  // Function to handle the mouse move event for resizing
  const handleMouseMove = (e) => {
      if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
      }
      animationFrameIdRef.current = requestAnimationFrame(() => {
          const newHeight = Math.min(Math.max(10, terminalHeight + e.movementY / window.innerHeight * 100), 90);
          setTerminalHeight(newHeight);
      });
  };

  // Function to handle the mouse up event to stop resizing
  const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
      }
  };

  return (
    <div className="w-[100vw] flex h-screen">
      {/* Steps Panel */}
      <div className="w-[20%] h-[100vh] p-2 bg-gray-800 overflow-y-auto border-r">
   
      <Steps steps={steps} setViewMode={setViewMode} getAIResponse={getAIResponse} files={files} setFiles={setFiles}/>
      </div>

      {/* File Explorer */}
      <div className="w-[20%] bg-gray-800 p-2 overflow-y-auto border-r">
        <FileExplorer 
          files={files} 
          setFiles={setFiles}
          onFileSelect={handleFileSelect}
        />
      </div>

      {/* Code/Preview Panel */}
      <div className="w-[60%] flex flex-col overflow-y-auto bg-gray-800">
        <div className="flex border-b p-2 h-[10%]">
          <button
          style={{fontSize:"10px",height:"80%",display:"flex",alignItems:"center"}}
            className={`px-4 py-0 mr-2 rounded   ${
              viewMode === 'code' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
            onClick={() => setViewMode('code')}
          >
            Code
          </button>
          <button
          style={{fontSize:"10px",height:"80%",display:"flex",alignItems:"center"}}
            className={`px-4 py-1 mr-2 rounded ${
              viewMode === 'preview' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
            onClick={() => setViewMode('preview')}
          >
            Preview
          </button>
        </div>
        <SplitPane
            split="horizontal"
            minSize={90}
            defaultSize="70%"
            maxSize={-90}
            style={{height:"90%",position:"relative",maxHeight:'90%',minHeight:'0% !important'}}
            className="flex flex-col"
        >
            <div className="flex-1 p-4 overflow-y-auto">
                {viewMode === 'code' ? (
                    selectedFile ? (
                        <>
                            <Editor
                                height="100%"
                                defaultLanguage="javascript"
                                theme="vs-dark"
                                value={selectedFile.content}
                                onChange={handleEditorChange}
                                onMount={(editor, monaco) => {
                                    editorRef.current = editor; // Store the editor instance
                                }}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    tabCompletion: 'on',
                                    quickSuggestionsDelay: 0,
                                    suggestOnTriggerCharacters: true,
                                    quickSuggestions: {
                                        other: 'inline',
                                        comments: true,
                                        strings: true,
                                    },
                                    autoClosingBrackets: 'always', // Enable auto-closing brackets
                                    autoClosingQuotes: 'always',   // Enable auto-closing quotes
                                    autoClosingPairs: [
                                        { open: '<', close: '>' },   // Enable auto-closing for HTML tags
                                    ],
                                }}
                            />
                        </>
                    ) : (
                        <p>Select a file to view its contents</p>
                    )
                ) : (
                    <Preview webContainerInstance={webcontainer} isInitializedServer={isInitializedServer} setIsInitializedServer={setIsInitializedServer} url={url} setUrl={setUrl}/>
                )}
            </div>
            <div className="w-[100%] p-4 pt-0 flex flex-col">
                <TerminalComponent webcontainer={webcontainer} updateFileContent={updateFileContent} files={files} setFiles={setFiles} />
            </div>
        </SplitPane>
      </div>

      {/* Terminal Panel */}
  
    </div>
  );
}

export default Workspace; 