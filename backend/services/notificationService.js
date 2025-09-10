const sendSocketNotification = (io, room, event, payload) => {
  if (!io) return;
  io.to(room).emit(event, payload);
};

module.exports = { sendSocketNotification };
