import { Tabs, TabList, TabPanels, Tab, TabPanel } from "@chakra-ui/react";
import LockView from "./LockView";
function Bridge() {
  return (
    <div className="bridge">
      <Tabs isFitted>
        <TabList>
          <Tab>Lock</Tab>
          <Tab>Claim</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <LockView />
          </TabPanel>
          <TabPanel>
            <p>Claim</p>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}

export default Bridge;
