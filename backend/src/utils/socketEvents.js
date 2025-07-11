let io;

const setIO = (socketIO) => {
  io = socketIO;
};

const emitQuestUpdate = (eventType, questData) => {
  if (io) {
    io.emit('questUpdate', {
      type: eventType,
      quest: questData,
      timestamp: new Date().toISOString()
    });
  }
};

const emitQuestCreated = (quest) => {
  emitQuestUpdate('created', quest);
};

const emitQuestUpdated = (quest) => {
  emitQuestUpdate('updated', quest);
};

const emitQuestDeleted = (questId) => {
  if (io) {
    io.emit('questUpdate', {
      type: 'deleted',
      questId,
      timestamp: new Date().toISOString()
    });
  }
};

const emitQuestAccepted = (quest) => {
  emitQuestUpdate('accepted', quest);
};

const emitQuestCompleted = (quest) => {
  emitQuestUpdate('completed', quest);
};

module.exports = {
  setIO,
  emitQuestCreated,
  emitQuestUpdated,
  emitQuestDeleted,
  emitQuestAccepted,
  emitQuestCompleted
};