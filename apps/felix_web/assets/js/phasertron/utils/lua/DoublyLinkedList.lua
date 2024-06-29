DoublyLinkedList = {}
DoublyLinkedList.__index = DoublyLinkedList

function DoublyLinkedList.new()
    local self = setmetatable({}, DoublyLinkedList)
    self.headNode = nil
    self.tailNode = nil
    self.nodeCount = 0
    return self
end

function DoublyLinkedList:getCount()
    return self.nodeCount
end

function DoublyLinkedList:isEmpty()
    return self.nodeCount == 0
end

function DoublyLinkedList:getHead()
    return self.headNode and self.headNode.data
end

function DoublyLinkedList:getTail()
    return self.tailNode and self.tailNode.data
end

function DoublyLinkedList:insertFirst(data)
    local newNode = {
        data = data,
        next = nil,
        prev = nil
    }
    if self.headNode == nil then
        self.headNode = newNode
        self.tailNode = newNode
    else
        newNode.next = self.headNode
        self.headNode.prev = newNode
        self.headNode = newNode
    end
    self.nodeCount = self.nodeCount + 1
end

function DoublyLinkedList:insertLast(data)
    local newNode = {
        data = data,
        next = nil,
        prev = nil
    }
    if self.tailNode == nil then
        self.headNode = newNode
        self.tailNode = newNode
    else
        newNode.prev = self.tailNode
        self.tailNode.next = newNode
        self.tailNode = newNode
    end
    self.nodeCount = self.nodeCount + 1
end

function DoublyLinkedList:insertAt(data, index)
    if index < 0 or index > self.nodeCount then
        error('Index out of bounds')
    end

    if index == 0 then
        self:insertFirst(data)
        return
    elseif index == self.nodeCount then
        self:insertLast(data)
        return
    end

    local newNode = {
        data = data,
        next = nil,
        prev = nil
    }
    local currentNode = self.headNode
    local currentIndex = 0
    while currentNode ~= nil do
        if currentIndex == index then
            newNode.next = currentNode
            newNode.prev = currentNode.prev
            if currentNode.prev then
                currentNode.prev.next = newNode
            end
            currentNode.prev = newNode
            self.nodeCount = self.nodeCount + 1
            return
        end
        currentNode = currentNode.next
        currentIndex = currentIndex + 1
    end
end

function DoublyLinkedList:removeAt(index)
    if index < 0 or index >= self.nodeCount then
        error('Index out of bounds')
    end

    if index == 0 then
        return self:removeFirst()
    elseif index == self.nodeCount - 1 then
        return self:removeLast()
    end

    local currentNode = self.headNode
    local currentIndex = 0
    while currentNode ~= nil do
        if currentIndex == index then
            if currentNode.prev then
                currentNode.prev.next = currentNode.next
            end
            if currentNode.next then
                currentNode.next.prev = currentNode.prev
            end
            self.nodeCount = self.nodeCount - 1
            return currentNode.data
        end
        currentNode = currentNode.next
        currentIndex = currentIndex + 1
    end
    return nil
end

function DoublyLinkedList:removeFirst()
    if self.headNode == nil then
        return nil
    end

    local data = self.headNode.data
    if self.headNode.next ~= nil then
        self.headNode = self.headNode.next
        self.headNode.prev = nil
    else
        self.headNode = nil
        self.tailNode = nil
    end
    self.nodeCount = self.nodeCount - 1
    return data
end

function DoublyLinkedList:removeLast()
    if self.tailNode == nil then
        return nil
    end

    local data = self.tailNode.data
    if self.tailNode.prev ~= nil then
        self.tailNode = self.tailNode.prev
        self.tailNode.next = nil
    else
        self.headNode = nil
        self.tailNode = nil
    end
    self.nodeCount = self.nodeCount - 1
    return data
end

function DoublyLinkedList:iterator()
    local currentNode = self.headNode
    return function()
        if currentNode == nil then
            return nil
        end
        local data = currentNode.data
        currentNode = currentNode.next
        return data
    end
end
