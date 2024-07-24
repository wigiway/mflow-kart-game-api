const express = require('express');
const AWS = require('aws-sdk');

require('dotenv').config();


const bodyParser = require('body-parser');
const cors = require('cors');

// ตั้งค่า AWS
AWS.config.update({
  region: process.env.REGION,
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY
});

// สร้าง DynamoDB object
const dynamoDB = new AWS.DynamoDB.DocumentClient();

const app = express();
app.use(cors());
app.use(express.json()); // สำหรับ parsing application/json

//app.use(bodyParser.json()); // สำหรับรับ JSON data
//app.use(bodyParser.urlencoded({ extended: true })); // สำหรับรับ URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const generateKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = '';
  for (let i = 0; i < 10; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
};


// ตั้งค่า route ต่างๆ
app.get('/test11', (req, res) => {
  res.send('Hello this is server mflow kart game !');
});

// เพิ่ม route อื่นๆ ที่นี่
app.post('/addPlayer', async (req, res) => {
    try {
      console.log("Received request:", req.body);
  
      // แปลง id เป็นตัวเลข
      const idAsNumber = parseInt(req.body.id, 10);
      if (isNaN(idAsNumber)) {
        return res.status(400).send('Invalid id format');
      }
  
      // ตรวจสอบว่ามีผู้เล่นด้วย id นี้อยู่แล้วหรือไม่
      const checkParams = {
        TableName: "user-mflow",
        Key: {
          id: idAsNumber
        }
      };
      const existingPlayer = await dynamoDB.get(checkParams).promise();
      if (existingPlayer.Item) {
        return res.status(400).send('id นี้มีผู้ใช้แล้ว ไม่สามารถสมัครได้');
      }
  
      // หากไม่มี id นี้ สร้างผู้เล่นใหม่
      const newPlayer = {
        id: idAsNumber,
        name: req.body.name,
        score: 0
      };
  
      const params = {
        TableName: "user-mflow",
        Item: newPlayer
      };
  
      await dynamoDB.put(params).promise();
      res.status(200).json({ message: "Player added successfully", data: newPlayer });
    } catch (error) {
      console.error("Error adding player:", error);
      res.status(500).send(error);
    }
  });
  
  

  //Get User
  app.get('/getPlayerById/:id', async (req, res) => {
    const params = {
      TableName: "user-mflow",
      Key: {
        id: parseInt(req.params.id, 10) // แปลงค่า id ที่ได้จาก string เป็น number
      }
    };
  
    try {
      const data = await dynamoDB.get(params).promise();
      if (data.Item) {
        res.status(200).json(data.Item);
      } else {
        res.status(404).send('Player not found');
      }
    } catch (error) {
      console.error("Error getting player:", error);
      res.status(500).send(error);
    }
  });

  //Get All Users
  app.get('/getAllUsers', async (req, res) => {
    const params = {
      TableName: "user-mflow"
    };
  
    try {
      const data = await dynamoDB.scan(params).promise();
      if (data.Items && data.Items.length > 0) {
        res.status(200).json(data.Items);
      } else {
        res.status(404).send('No users found');
      }
    } catch (error) {
      console.error("Error getting users:", error);
      res.status(500).send(error);
    }
  });

  
  //Update Score User
  app.post('/updateScore/:id', async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const newScore = parseInt(req.body.score, 10); // คะแนนใหม่
  
    // ดึงคะแนนปัจจุบันจากฐานข้อมูล
    const getParams = {
      TableName: "user-mflow",
      Key: { id: userId }
    };
  
    try {
      const currentData = await dynamoDB.get(getParams).promise();
      const currentScore = currentData.Item ? currentData.Item.score : 0;
  
      // เปรียบเทียบและอัพเดทคะแนนถ้าคะแนนใหม่สูงกว่า
      if (newScore > currentScore) {
        const updateParams = {
          TableName: "user-mflow",
          Key: { id: userId },
          UpdateExpression: "set score = :newScore",
          ExpressionAttributeValues: {
            ":newScore": newScore
          },
          ReturnValues: "UPDATED_NEW"
        };
  
        const updateResult = await dynamoDB.update(updateParams).promise();
        res.status(200).json(updateResult.Attributes);
      } else {
        res.status(200).json({ message: "No update required, new score is not higher." });
      }
  
    } catch (error) {
      console.error("Error in score update process:", error);
      res.status(500).send(error);
    }
  });
  
  
  
  app.post('/login', async (req, res) => {
    try {
      // แปลง id เป็นตัวเลข
      const idAsNumber = parseInt(req.body.id, 10);
      if (isNaN(idAsNumber)) {
        return res.status(400).send('Invalid id format');
      }
  
      // ตรวจสอบในฐานข้อมูล
      const params = {
        TableName: "user-mflow",
        Key: {
          id: idAsNumber
        }
      };
  
      const result = await dynamoDB.get(params).promise();
      if (result.Item) {
        // ถ้ามีข้อมูล user ส่งข้อมูลนั้นกลับไป
        res.status(200).json(result.Item);
      } else {
        // ถ้าไม่พบข้อมูล user
        res.status(404).send('User not found');
      }
    } catch (error) {
      console.error("Error on login:", error);
      res.status(500).send(error);
    }
  });

  app.post('/checkId', async (req, res) => {
    const userId = parseInt(req.body.id, 10);
  
    const params = {
      TableName: "user-mflow",
      Key: {
        id: userId
      }
    };
  
    try {
      const data = await dynamoDB.get(params).promise();
      
      // ตรวจสอบว่าพบ id ในฐานข้อมูลหรือไม่
      if (data.Item) {
        res.status(200).json({ isUnique: false }); // id ซ้ำ
      } else {
        res.status(200).json({ isUnique: true }); // id ไม่ซ้ำ
      }
    } catch (error) {
      console.error("Error in checking ID:", error);
      res.status(500).send(error);
    }
  });

app.post('/checkName', async (req, res) => {
  const userName = req.body.name;

  const params = {
    TableName: "user-mflow",
    FilterExpression: "#nm = :name",
    ExpressionAttributeNames: {
      "#nm": "name"
    },
    ExpressionAttributeValues: {
      ":name": userName
    }
  };

  try {
    const data = await dynamoDB.scan(params).promise();
    
    if (data.Items && data.Items.length > 0) {
      res.status(200).send("มีผู้ใช้ชื่อนี้ไปแล้ว"); // ชื่อซ้ำ
    } else {
      res.status(200).send("สมัครสำเร็จ"); // ชื่อไม่ซ้ำ
    }
  } catch (error) {
    console.error("Error in checking name:", error);
    res.status(500).send(error);
  }
});


app.get('/resetUserScores', async (req, res) => {
  const params = {
    TableName: "user-mflow"
  };

  try {
    const data = await dynamoDB.scan(params).promise();
    if (data.Items && data.Items.length > 0) {
      // Loop through each user and set score to 0
      data.Items.forEach(async (user) => {
        const updateParams = {
          TableName: "user-mflow",
          Key: {
            userId: user.userId // Assuming your user has a unique identifier named userId
          },
          UpdateExpression: "SET score = :score",
          ExpressionAttributeValues: {
            ":score": 0
          },
          ReturnValues: "ALL_NEW" // Change if needed
        };

        await dynamoDB.update(updateParams).promise();
      });

      res.status(200).json({ message: 'User scores reset successfully' });
    } else {
      res.status(404).send('No users found');
    }
  } catch (error) {
    console.error("Error resetting user scores:", error);
    res.status(500).send(error);
  }
});

  
app.post('/CreateKeysUnlock', async (req, res) => {
  const keys = [];
  for (let i = 0; i < 20; i++) {
    keys.push({
      'key-unlock': generateKey(),
      used: false
    });
  }

  const writeRequests = keys.map(item => ({
    PutRequest: {
      Item: item
    }
  }));

  const params = {
    RequestItems: {
      'duct-users-keys': writeRequests
    }
  };

  try {
    await dynamoDB.batchWrite(params).promise();
    res.status(200).json({ message: 'Keys created successfully', keys });
  } catch (error) {
    console.error('Error creating keys:', error);
    res.status(500).send(error);
  }
});

// Route สำหรับใช้งานคีย์
app.post('/UseKeyUnlock', async (req, res) => {
  const { key } = req.body;

  const params = {
    TableName: 'duct-users-keys',
    Key: { 'key-unlock': key }
  };

  try {
    const data = await dynamoDB.get(params).promise();
    if (data.Item && !data.Item.used) {
      const updateParams = {
        TableName: 'duct-users-keys',
        Key: { 'key-unlock': key },
        UpdateExpression: 'set used = :used',
        ExpressionAttributeValues: {
          ':used': true
        },
        ReturnValues: 'UPDATED_NEW'
      };

      await dynamoDB.update(updateParams).promise();
      res.status(200).json({ message: 'Key used successfully', success: true });
    } else {
      res.status(404).json({ message: 'Invalid or already used key', success: false });
    }
  } catch (error) {
    console.error('Error using key:', error);
    res.status(500).send(error);
  }
});
  

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
  
