import { join as joinPath, normalize as normalizePath, extname as pathExtension } from 'path';
import fs from 'fs-extra';
import FileSystem from '../../common/file_system';
import config from '../../common/config';
import Logger from '../../common/logger';
import {
  RuleNotFoundError, RuleNotReadableError, RuleNotWritableError,
  RulesFolderNotFoundError, RulesRootFolderNotCreatableError
} from '../../common/errors/rule_request_errors';

let logger = new Logger('RulesController');

export default class RulesController {
  constructor() {
    this._fileSystemController = new FileSystem();
    this.rulesFolder = this._getRulesFolder();
  }
  getRulesAll() {
    const self = this;
    return new Promise(function(resolve, reject) {
      self._fileSystemController.readdirSync(fs.rulesFolder)
      const items = fs.readdirSync
        .then(function(rules) {
          resolve.json(rules);
        })
        .catch(function(error) {
          logger.warn(`The requested folder (${self.rulesFolder}) couldn't be found / read by the server. Error:`, error);
          reject(new RulesFolderNotFoundError(self.rulesFolder));
        });
    });
  }
   
  getRules(path) {
    const self = this;
    const fullPath = joinPath(self.rulesFolder, path);
  
    async function readDirectoryRecursive(dirPath) {
      try {
        const directoryIndex = await self._fileSystemController.readDirectory(dirPath);
  
        // Combine files and directories into a single array
        const allItems = [
          ...(directoryIndex.files || []),
          ...(directoryIndex.directories || []),
        ];
  
        // Process both files and subdirectories
        const itemsInfo = await Promise.all(
          allItems.map(async (item) => {
            const itemPath = joinPath(dirPath, item);
            const isDirectory = directoryIndex.directories && directoryIndex.directories.includes(item);
  
            if (isDirectory) {
              // Recursively process subdirectories
              const subfolderInfo = await readDirectoryRecursive(itemPath);
  
              // Flatten structure for subdirectory
              return subfolderInfo;
            } else {
              // Process files
              const fileName = item.replace(/\.(yaml|yml)$/, ''); // Remove .yaml or .yml extension
              return fileName;
            }
          })
        );
  
        return { [dirPath.split('/').pop()]: itemsInfo };
        // return result;
      } catch (error) {
        return new Promise(function (resolve, reject) {
          if (normalizePath(self.rulesFolder) === fullPath) {
            // If the root folder doesn't exist, try creating it
            fs.mkdir(fullPath, { recursive: true }, function (error) {
              if (error) {
                reject(new RulesRootFolderNotCreatableError());
                logger.warn(`The rules root folder (${fullPath}) couldn't be found nor could it be created by the file system.`);
              } else {
                // Return an empty directory if created successfully
                resolve(self._fileSystemController.getEmptyDirectoryIndex());
              }
            });
          } else {
            logger.warn(`The requested folder (${fullPath}) couldn't be found / read by the server. Error:`, error);
            reject(new RulesFolderNotFoundError(path));
          }
        });
      }
    }
  
    return new Promise(function (resolve, reject) {
      readDirectoryRecursive(fullPath)
        .then(resolve)
        .catch(reject);
    });
  }
  
  rule(id, path) {
    const self = this;
    return new Promise(function(resolve, reject) {
      self._findRule(id)
        .then(function(access) {
          resolve({
            get: function() {
              if (access.read) {
                return self._getRule(id);
              }
              return self._getErrorPromise(new RuleNotReadableError(id));
            },
            edit: function(body) {
              if (access.write) {
                return self._editRule(id, body);
              }
              return self._getErrorPromise(new RuleNotWritableError(id));
            },
            delete: function() {
              return self._deleteRule(id, path);
            }
          });
        })
        .catch(function() {
          reject(new RuleNotFoundError(id));
        });
    });
  }

  createRule(id, content) {
    return this._editRule(id, content);
  }

  _findRule(id) {
    let fileName = id + '.yaml';
    const self = this;
    return new Promise(function(resolve, reject) {
      self._fileSystemController.fileExists(joinPath(self.rulesFolder, fileName))
        .then(function(exists) {
          if (!exists) {
            reject();
          } else {
            //TODO: Get real permissions
            //resolve(permissions);
            resolve({
              read: true,
              write: true
            });
          }
        })
        .catch(function(error) {
          reject(error);
        });
    });
  }

  _getRule(id) {
    const path = joinPath(this.rulesFolder, id + '.yaml');
    return this._fileSystemController.readFile(path);
  }

  _editRule(id, body) {
    const path = joinPath(this.rulesFolder, id + '.yaml');
    return this._fileSystemController.writeFile(path, body);
  }

  _deleteRule(id) {
    const path = joinPath(this.rulesFolder, id + '.yaml');
    return this._fileSystemController.deleteFile(path);
  }

  _getErrorPromise(error) {
    return new Promise(function(resolve, reject) {
      reject(error);
    });
  }

  _getRulesFolder() {
    const ruleFolderSettings = config.get('rulesPath');

    if (ruleFolderSettings.relative) {
      return joinPath(config.get('elastalertPath'), ruleFolderSettings.path);
    } else {
      return ruleFolderSettings.path;
    }
  }
}

// import { join as joinPath, normalize as normalizePath, extname as pathExtension } from 'path';
// import fs from 'fs-extra';
// import FileSystem from '../../common/file_system';
// import config from '../../common/config';
// import Logger from '../../common/logger';
// import {
//   RuleNotFoundError, RuleNotReadableError, RuleNotWritableError,
//   RulesFolderNotFoundError, RulesRootFolderNotCreatableError
// } from '../../common/errors/rule_request_errors';

// let logger = new Logger('RulesController');

// export default class RulesController {
//   constructor() {
//     this._fileSystemController = new FileSystem();
//     this.rulesFolder = this._getRulesFolder();
//   }

//   getRulesAll() {
//     const self = this;
//     return new Promise(function(resolve, reject) {
//       self._fileSystemController.readDirectoryRecursive(self.rulesFolder)
//         .then(function(rules) {
//           resolve(rules);
//         })
//         .catch(function(error) {
//           logger.warn(`The requested folder (${self.rulesFolder}) couldn't be found / read by the server. Error:`, error);
//           reject(new RulesFolderNotFoundError(self.rulesFolder));
//         });
//     });
//   }

//   getRules(path) {
//     const self = this;
//     const fullPath = joinPath(self.rulesFolder, path);
//     return new Promise(function(resolve, reject) {
//       self._fileSystemController.readDirectory(fullPath)
//         .then(function(directoryIndex) {
//           directoryIndex.rules = directoryIndex.files.filter(function(fileName) {
//             return pathExtension(fileName).toLowerCase() === '.yaml';
//           }).map(function(fileName) {
//             return fileName.slice(0, -5);
//           });
//           delete directoryIndex.files;
//           Object.entries(directoryIndex).forEach(entry => {
//             directoryIndex.directories.push(entry);
//           });
//           resolve(directoryIndex);
//           //resolve({"rules": "test"});
//         })
//         .catch(function(error) {

//           // Check if the requested folder is the rules root folder
//           if (normalizePath(self.rulesFolder) === fullPath) {

//             // Try to create the root folder
//             fs.mkdir(fullPath, { recursive: true }, function(error) {
//               if (error) {
//                 reject(new RulesRootFolderNotCreatableError());
//                 logger.warn(`The rules root folder (${fullPath}) couldn't be found nor could it be created by the file system.`);
//               } else {
//                 resolve(self._fileSystemController.getEmptyDirectoryIndex());
//               }
//             });
//           } else {
//             logger.warn(`The requested folder (${fullPath}) couldn't be found / read by the server. Error:`, error);
//             reject(new RulesFolderNotFoundError(path));
//           }
//         });
//     });
//   }

//   rule(id, path) {
//     const self = this;
//     return new Promise(function(resolve, reject) {
//       self._findRule(id)
//         .then(function(access) {
//           resolve({
//             get: function() {
//               if (access.read) {
//                 return self._getRule(id);
//               }
//               return self._getErrorPromise(new RuleNotReadableError(id));
//             },
//             edit: function(body) {
//               if (access.write) {
//                 return self._editRule(id, body);
//               }
//               return self._getErrorPromise(new RuleNotWritableError(id));
//             },
//             delete: function() {
//               return self._deleteRule(id, path);
//             }
//           });
//         })
//         .catch(function() {
//           reject(new RuleNotFoundError(id));
//         });
//     });
//   }

//   createRule(id, content) {
//     return this._editRule(id, content);
//   }

//   _findRule(id) {
//     let fileName = id + '.yaml';
//     const self = this;
//     return new Promise(function(resolve, reject) {
//       self._fileSystemController.fileExists(joinPath(self.rulesFolder, fileName))
//         .then(function(exists) {
//           if (!exists) {
//             reject();
//           } else {
//             //TODO: Get real permissions
//             //resolve(permissions);
//             resolve({
//               read: true,
//               write: true
//             });
//           }
//         })
//         .catch(function(error) {
//           reject(error);
//         });
//     });
//   }

//   _getRule(id) {
//     const path = joinPath(this.rulesFolder, id + '.yaml');
//     return this._fileSystemController.readFile(path);
//   }

//   _editRule(id, body) {
//     const path = joinPath(this.rulesFolder, id + '.yaml');
//     return this._fileSystemController.writeFile(path, body);
//   }

//   _deleteRule(id) {
//     const path = joinPath(this.rulesFolder, id + '.yaml');
//     return this._fileSystemController.deleteFile(path);
//   }

//   _getErrorPromise(error) {
//     return new Promise(function(resolve, reject) {
//       reject(error);
//     });
//   }

//   _getRulesFolder() {
//     const ruleFolderSettings = config.get('rulesPath');

//     if (ruleFolderSettings.relative) {
//       return joinPath(config.get('elastalertPath'), ruleFolderSettings.path);
//     } else {
//       return ruleFolderSettings.path;
//     }
//   }
// }
