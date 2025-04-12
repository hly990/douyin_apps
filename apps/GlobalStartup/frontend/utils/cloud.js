/**
 * 云开发工具模块
 * 封装抖音小程序云开发API，提供云函数调用、云数据库操作和云存储功能
 */

// 初始化云开发环境
const initCloud = () => {
  if (!tt.cloud) {
    console.error('请使用抖音/头条等字节系小程序，并确保基础库版本支持云开发');
    return false;
  }
  
  try {
    tt.cloud.init({
      env: 'production', // 云环境ID，实际开发中替换为你的环境ID
    });
    return true;
  } catch (e) {
    console.error('云开发初始化失败', e);
    return false;
  }
};

// 调用云函数
const callFunction = (name, data = {}) => {
  return new Promise((resolve, reject) => {
    if (!initCloud()) {
      reject(new Error('云环境初始化失败'));
      return;
    }
    
    tt.cloud.callFunction({
      name,
      data,
      success: (res) => {
        resolve(res.result);
      },
      fail: (err) => {
        console.error(`云函数 ${name} 调用失败`, err);
        reject(err);
      }
    });
  });
};

// 云数据库集合
const db = tt.cloud ? tt.cloud.database() : null;

// 获取云数据库集合
const collection = (name) => {
  if (!db) {
    console.error('云数据库初始化失败');
    return null;
  }
  return db.collection(name);
};

// 上传文件到云存储
const uploadFile = (cloudPath, filePath) => {
  return new Promise((resolve, reject) => {
    if (!initCloud()) {
      reject(new Error('云环境初始化失败'));
      return;
    }
    
    tt.cloud.uploadFile({
      cloudPath, // 云存储路径
      filePath, // 本地文件路径
      success: (res) => {
        resolve(res.fileID);
      },
      fail: (err) => {
        console.error('文件上传失败', err);
        reject(err);
      }
    });
  });
};

// 从云存储下载文件
const downloadFile = (fileID) => {
  return new Promise((resolve, reject) => {
    if (!initCloud()) {
      reject(new Error('云环境初始化失败'));
      return;
    }
    
    tt.cloud.downloadFile({
      fileID,
      success: (res) => {
        resolve(res.tempFilePath);
      },
      fail: (err) => {
        console.error('文件下载失败', err);
        reject(err);
      }
    });
  });
};

// 获取云存储文件临时链接
const getTempFileURL = (fileList) => {
  return new Promise((resolve, reject) => {
    if (!initCloud()) {
      reject(new Error('云环境初始化失败'));
      return;
    }
    
    tt.cloud.getTempFileURL({
      fileList: Array.isArray(fileList) ? fileList : [fileList],
      success: (res) => {
        resolve(res.fileList);
      },
      fail: (err) => {
        console.error('获取临时链接失败', err);
        reject(err);
      }
    });
  });
};

// 删除云存储文件
const deleteFile = (fileList) => {
  return new Promise((resolve, reject) => {
    if (!initCloud()) {
      reject(new Error('云环境初始化失败'));
      return;
    }
    
    tt.cloud.deleteFile({
      fileList: Array.isArray(fileList) ? fileList : [fileList],
      success: (res) => {
        resolve(res.fileList);
      },
      fail: (err) => {
        console.error('删除文件失败', err);
        reject(err);
      }
    });
  });
};

// 导出云开发模块
module.exports = {
  callFunction,
  collection,
  uploadFile,
  downloadFile,
  getTempFileURL,
  deleteFile
}; 