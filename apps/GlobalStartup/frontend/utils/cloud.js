/**
 * 云开发工具模块
 * 封装抖音小程序云开发API，提供云函数调用、云数据库操作和云存储功能
 */

// 全局云实例缓存
let cloudInstance = null;

// 获取云开发实例（支持缓存）
const getCloudInstance = () => {
  return new Promise((resolve, reject) => {
    // 如果已有实例且未过期，直接返回
    if (cloudInstance) {
      resolve(cloudInstance);
      return;
    }

    // 登录并创建云实例
    tt.login({
      success: (res) => {
        try {
          console.log('登录成功，创建云实例');
          const cloud = tt.createCloud({
            envID: 'env-vsLX8rVGBn', // 你的环境ID
          });
          
          // 缓存云实例
          cloudInstance = cloud;
          resolve(cloud);
        } catch (err) {
          console.error('创建云实例失败', err);
          reject(err);
        }
      },
      fail: (err) => {
        console.error('登录失败', err);
        reject(err);
      }
    });
  });
};

// 获取数据库实例
const getDatabase = async () => {
  try {
    const cloud = await getCloudInstance();
    console.log('获取数据库实例');
    return await cloud.database();
  } catch (err) {
    console.error('获取数据库实例失败', err);
    throw err;
  }
};

// 调用云函数
const callFunction = async (name, data = {}) => {
  try {
    console.log(`调用云函数: ${name}`, data);
    const cloud = await getCloudInstance();
    
    return new Promise((resolve, reject) => {
      cloud.callFunction({
        name,
        data,
        success: (res) => {
          console.log(`云函数 ${name} 调用成功:`, res);
          resolve(res.result);
        },
        fail: (err) => {
          console.error(`云函数 ${name} 调用失败:`, err);
          reject(err);
        }
      });
    });
  } catch (err) {
    console.error(`调用云函数 ${name} 失败:`, err);
    throw err;
  }
};

// 查询集合数据
const queryCollection = async (collectionName, limit = 10) => {
  try {
    console.log(`查询集合: ${collectionName}, 限制: ${limit}`);
    const db = await getDatabase();
    return await db.collection(collectionName).limit(limit).get();
  } catch (err) {
    console.error(`查询集合 ${collectionName} 失败:`, err);
    throw err;
  }
};

// 添加数据到集合
const addDocument = async (collectionName, data) => {
  try {
    console.log(`添加数据到集合: ${collectionName}`, data);
    const db = await getDatabase();
    return await db.collection(collectionName).add({ data });
  } catch (err) {
    console.error(`添加数据到集合 ${collectionName} 失败:`, err);
    throw err;
  }
};

// 获取云存储文件临时链接
const getTempFileURL = async (fileList) => {
  try {
    console.log('获取云存储文件临时链接:', fileList);
    const cloud = await getCloudInstance();
    
    // 确保参数正确
    const files = Array.isArray(fileList) ? fileList : [fileList];
    
    return new Promise((resolve, reject) => {
      cloud.getTempFileURL({
        fileList: files,
        success: (res) => {
          console.log('获取临时链接成功:', res);
          resolve(res.fileList);
        },
        fail: (err) => {
          console.error('获取临时链接失败:', err);
          reject(err);
        }
      });
    });
  } catch (err) {
    console.error('获取临时链接失败:', err);
    throw err;
  }
};

// 上传文件到云存储
const uploadFile = async (cloudPath, filePath) => {
  try {
    console.log(`上传文件: ${filePath} -> ${cloudPath}`);
    const cloud = await getCloudInstance();
    
    return new Promise((resolve, reject) => {
      cloud.uploadFile({
        cloudPath,
        filePath,
        success: (res) => {
          console.log('文件上传成功:', res);
          resolve(res.fileID);
        },
        fail: (err) => {
          console.error('文件上传失败:', err);
          reject(err);
        }
      });
    });
  } catch (err) {
    console.error('上传文件失败:', err);
    throw err;
  }
};

// 下载云存储文件
const downloadFile = async (fileID) => {
  try {
    console.log(`下载文件: ${fileID}`);
    const cloud = await getCloudInstance();
    
    return new Promise((resolve, reject) => {
      cloud.downloadFile({
        fileID,
        success: (res) => {
          console.log('文件下载成功:', res);
          resolve(res.tempFilePath);
        },
        fail: (err) => {
          console.error('文件下载失败:', err);
          reject(err);
        }
      });
    });
  } catch (err) {
    console.error('下载文件失败:', err);
    throw err;
  }
};

// 删除云存储文件
const deleteFile = async (fileList) => {
  try {
    console.log('删除文件:', fileList);
    const cloud = await getCloudInstance();
    
    // 确保参数正确
    const files = Array.isArray(fileList) ? fileList : [fileList];
    
    return new Promise((resolve, reject) => {
      cloud.deleteFile({
        fileList: files,
        success: (res) => {
          console.log('文件删除成功:', res);
          resolve(res.fileList);
        },
        fail: (err) => {
          console.error('文件删除失败:', err);
          reject(err);
        }
      });
    });
  } catch (err) {
    console.error('删除文件失败:', err);
    throw err;
  }
};

// 导出云开发模块
module.exports = {
  getCloudInstance,
  getDatabase,
  callFunction,
  queryCollection,
  addDocument,
  getTempFileURL,
  uploadFile,
  downloadFile,
  deleteFile
}; 